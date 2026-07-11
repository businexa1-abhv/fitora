import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  LeaveRequestStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import {
  CreateLeaveRequestDto,
  CreateTrainingNoteDto,
  ReviewLeaveRequestDto,
  UpdateTrainerProfileDto,
  UpdateTrainingNoteDto,
} from './dto/trainer.dto';

@Injectable()
export class TrainersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getOrCreateProfile(trainerId: string) {
    let profile = await this.prisma.trainerProfile.findFirst({
      where: { userId: trainerId, deletedAt: null },
    });

    if (!profile) {
      profile = await this.prisma.trainerProfile.create({
        data: { userId: trainerId },
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: trainerId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    return this.formatProfile(profile, user);
  }

  async updateProfile(trainerId: string, dto: UpdateTrainerProfileDto) {
    await this.getOrCreateProfile(trainerId);

    const profile = await this.prisma.trainerProfile.update({
      where: { userId: trainerId },
      data: {
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
        specializations: dto.specializations,
        certifications: dto.certifications as Prisma.InputJsonValue | undefined,
      },
    });

    const user = await this.prisma.user.findFirst({
      where: { id: trainerId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    return this.formatProfile(profile, user);
  }

  async getSchedule(trainerId: string) {
    const batches = await this.prisma.trainingBatch.findMany({
      where: { trainerId, isActive: true, deletedAt: null },
      include: {
        program: {
          include: {
            court: { select: { id: true, name: true, city: true } },
            sport: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: {
          select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: batches.map((b) => ({
        batchId: b.id,
        batchName: b.name,
        schedule: b.schedule,
        startDate: b.startDate?.toISOString().split('T')[0] ?? null,
        endDate: b.endDate?.toISOString().split('T')[0] ?? null,
        maxCapacity: b.maxCapacity,
        activeStudents: b._count.enrollments,
        program: {
          id: b.program.id,
          name: b.program.name,
          fee: Number(b.program.fee),
        },
        court: b.program.court,
        sport: b.program.sport,
      })),
    };
  }

  async getPerformance(trainerId: string) {
    const profile = await this.prisma.trainerProfile.findFirst({
      where: { userId: trainerId, deletedAt: null },
    });

    const batches = await this.prisma.trainingBatch.findMany({
      where: { trainerId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    const batchIds = batches.map((b) => b.id);

    const activeEnrollments = batchIds.length
      ? await this.prisma.trainingEnrollment.findMany({
          where: { batchId: { in: batchIds }, status: EnrollmentStatus.ACTIVE },
          select: { id: true },
        })
      : [];
    const enrollmentIds = activeEnrollments.map((e) => e.id);

    const [attendanceStats, reportsCount, leaveStats] = await Promise.all([
      enrollmentIds.length
        ? this.prisma.attendanceRecord.groupBy({
            by: ['present'],
            where: { enrollmentId: { in: enrollmentIds }, deletedAt: null },
            _count: true,
          })
        : Promise.resolve([]),
      this.prisma.progressReport.count({
        where: { authorId: trainerId, deletedAt: null },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ['status'],
        where: { trainerId, deletedAt: null },
        _count: true,
      }),
    ]);

    const present = attendanceStats.find((s) => s.present)?._count ?? 0;
    const absent = attendanceStats.find((s) => !s.present)?._count ?? 0;
    const totalSessions = present + absent;

    const leaveByStatus = Object.fromEntries(
      leaveStats.map((s) => [s.status, s._count]),
    ) as Record<string, number>;

    return {
      averageRating: profile?.averageRating ? Number(profile.averageRating) : null,
      yearsExperience: profile?.yearsExperience ?? null,
      isVerified: profile?.isVerified ?? false,
      batchCount: batches.length,
      activeStudents: enrollmentIds.length,
      sessionsMarked: totalSessions,
      attendanceRate: totalSessions ? Math.round((present / totalSessions) * 100) : 0,
      presentCount: present,
      absentCount: absent,
      progressReportsWritten: reportsCount,
      leaveRequests: {
        pending: leaveByStatus[LeaveRequestStatus.PENDING] ?? 0,
        approved: leaveByStatus[LeaveRequestStatus.APPROVED] ?? 0,
        rejected: leaveByStatus[LeaveRequestStatus.REJECTED] ?? 0,
      },
    };
  }

  async listNotes(
    trainerId: string,
    filters: { batchId?: string; enrollmentId?: string },
  ) {
    const notes = await this.prisma.trainingNote.findMany({
      where: {
        trainerId,
        deletedAt: null,
        batchId: filters.batchId,
        enrollmentId: filters.enrollmentId,
      },
      include: {
        batch: { select: { id: true, name: true } },
        enrollment: {
          select: {
            id: true,
            kid: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notes.map((n) => this.formatNote(n));
  }

  async createNote(trainerId: string, dto: CreateTrainingNoteDto) {
    if (!dto.batchId && !dto.enrollmentId) {
      throw new BadRequestException('batchId or enrollmentId is required');
    }

    if (dto.batchId) {
      await this.assertTrainerBatch(trainerId, dto.batchId);
    }

    if (dto.enrollmentId) {
      const enrollment = await this.prisma.trainingEnrollment.findFirst({
        where: { id: dto.enrollmentId, deletedAt: null },
        include: { batch: true },
      });
      if (!enrollment) throw new NotFoundException('Enrollment not found');
      this.assertTrainerBatch(trainerId, enrollment.batchId);
    }

    const note = await this.prisma.trainingNote.create({
      data: {
        trainerId,
        batchId: dto.batchId,
        enrollmentId: dto.enrollmentId,
        sessionDate: dto.sessionDate ? new Date(`${dto.sessionDate}T00:00:00.000Z`) : null,
        title: dto.title,
        content: dto.content,
        isPrivate: dto.isPrivate ?? true,
      },
      include: {
        batch: { select: { id: true, name: true } },
        enrollment: {
          select: {
            id: true,
            kid: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return this.formatNote(note);
  }

  async updateNote(trainerId: string, noteId: string, dto: UpdateTrainingNoteDto) {
    const note = await this.getNoteEntity(noteId, trainerId);

    const updated = await this.prisma.trainingNote.update({
      where: { id: note.id },
      data: {
        title: dto.title,
        content: dto.content,
        isPrivate: dto.isPrivate,
        sessionDate: dto.sessionDate
          ? new Date(`${dto.sessionDate}T00:00:00.000Z`)
          : undefined,
      },
      include: {
        batch: { select: { id: true, name: true } },
        enrollment: {
          select: {
            id: true,
            kid: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return this.formatNote(updated);
  }

  async deleteNote(trainerId: string, noteId: string) {
    const note = await this.getNoteEntity(noteId, trainerId);
    await this.prisma.trainingNote.update({
      where: { id: note.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async createLeaveRequest(trainerId: string, dto: CreateLeaveRequestDto) {
    const start = new Date(`${dto.startDate}T00:00:00.000Z`);
    const end = new Date(`${dto.endDate}T00:00:00.000Z`);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        trainerId,
        deletedAt: null,
        status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlapping) {
      throw new BadRequestException('Overlapping leave request already exists');
    }

    const leave = await this.prisma.leaveRequest.create({
      data: {
        trainerId,
        startDate: start,
        endDate: end,
        reason: dto.reason,
      },
    });

    await this.notifyOwnersOfLeaveRequest(leave.id, trainerId, 'submitted');

    return this.formatLeaveRequest(leave);
  }

  async listMyLeaveRequests(trainerId: string) {
    const items = await this.prisma.leaveRequest.findMany({
      where: { trainerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((l) => this.formatLeaveRequest(l));
  }

  async cancelLeaveRequest(trainerId: string, leaveId: string) {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveId, trainerId, deletedAt: null },
    });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be cancelled');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status: LeaveRequestStatus.CANCELLED },
    });

    return this.formatLeaveRequest(updated);
  }

  async listLeaveRequestsForOwner(user: AuthUserPayload) {
    const trainerIds = await this.getOwnerTrainerIds(user.id);
    if (!trainerIds.length) return [];

    const items = await this.prisma.leaveRequest.findMany({
      where: { trainerId: { in: trainerIds }, deletedAt: null },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map((l) => ({
      ...this.formatLeaveRequest(l),
      trainer: l.trainer,
    }));
  }

  async reviewLeaveRequest(
    leaveId: string,
    dto: ReviewLeaveRequestDto,
    reviewer: AuthUserPayload,
  ) {
    if (
      dto.status !== LeaveRequestStatus.APPROVED &&
      dto.status !== LeaveRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }

    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveId, deletedAt: null },
    });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Leave request is no longer pending');
    }

    const trainerIds = await this.getOwnerTrainerIds(reviewer.id);
    const isAdmin = reviewer.roles.includes(UserRole.ADMIN);
    if (!isAdmin && !trainerIds.includes(leave.trainerId)) {
      throw new ForbiddenException('Not authorized to review this leave request');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    await this.notificationsService.notifyLeaveRequestUpdate(leave.trainerId, {
      leaveRequestId: leave.id,
      status: dto.status,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      reviewNote: dto.reviewNote,
    });

    return this.formatLeaveRequest(updated);
  }

  async getBatchAttendanceForDate(
    trainerId: string,
    batchId: string,
    dateStr: string,
  ) {
    await this.assertTrainerBatch(trainerId, batchId);
    const date = new Date(`${dateStr}T00:00:00.000Z`);

    const enrollments = await this.prisma.trainingEnrollment.findMany({
      where: { batchId, status: EnrollmentStatus.ACTIVE, deletedAt: null },
      include: { kid: { select: { id: true, firstName: true, lastName: true } } },
    });

    const enrollmentIds = enrollments.map((e) => e.id);
    const records = enrollmentIds.length
      ? await this.prisma.attendanceRecord.findMany({
          where: { enrollmentId: { in: enrollmentIds }, date, deletedAt: null },
        })
      : [];

    const recordMap = new Map(records.map((r) => [r.enrollmentId, r]));

    return {
      batchId,
      date: dateStr,
      enrollments: enrollments.map((e) => ({
        enrollmentId: e.id,
        kid: e.kid,
        record: recordMap.get(e.id)
          ? {
              present: recordMap.get(e.id)!.present,
              notes: recordMap.get(e.id)!.notes,
            }
          : null,
      })),
    };
  }

  private async getOwnerTrainerIds(ownerId: string) {
    const batches = await this.prisma.trainingBatch.findMany({
      where: {
        deletedAt: null,
        program: { court: { ownerId }, deletedAt: null },
      },
      select: { trainerId: true },
      distinct: ['trainerId'],
    });
    return batches.map((b) => b.trainerId);
  }

  private async notifyOwnersOfLeaveRequest(
    leaveId: string,
    trainerId: string,
    action: 'submitted',
  ) {
    const batches = await this.prisma.trainingBatch.findMany({
      where: { trainerId, deletedAt: null },
      include: { program: { include: { court: { select: { ownerId: true, name: true } } } } },
    });

    const ownerIds = [...new Set(batches.map((b) => b.program.court.ownerId))];
    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId },
      select: { firstName: true, lastName: true },
    });
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'A trainer';

    for (const ownerId of ownerIds) {
      await this.notificationsService.create(
        ownerId,
        NotificationType.LEAVE_REQUEST_UPDATE,
        'New leave request',
        `${trainerName} submitted a leave request for review.`,
        { leaveRequestId: leaveId, trainerId, action },
      );
    }
  }

  private async assertTrainerBatch(trainerId: string, batchId: string) {
    const batch = await this.prisma.trainingBatch.findFirst({
      where: { id: batchId, trainerId, deletedAt: null },
    });
    if (!batch) throw new ForbiddenException('Batch not assigned to you');
    return batch;
  }

  private async getNoteEntity(noteId: string, trainerId: string) {
    const note = await this.prisma.trainingNote.findFirst({
      where: { id: noteId, trainerId, deletedAt: null },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  private formatProfile(
    profile: {
      id: string;
      userId: string;
      bio: string | null;
      certifications: Prisma.JsonValue;
      yearsExperience: number | null;
      specializations: string[];
      isVerified: boolean;
      averageRating: Prisma.Decimal | null;
      createdAt: Date;
      updatedAt: Date;
    },
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    } | null,
  ) {
    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.bio,
      certifications: profile.certifications,
      yearsExperience: profile.yearsExperience,
      specializations: profile.specializations,
      isVerified: profile.isVerified,
      averageRating: profile.averageRating ? Number(profile.averageRating) : null,
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          }
        : null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private formatNote(note: {
    id: string;
    trainerId: string;
    enrollmentId: string | null;
    batchId: string | null;
    sessionDate: Date | null;
    title: string | null;
    content: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    batch?: { id: string; name: string } | null;
    enrollment?: {
      id: string;
      kid: { id: string; firstName: string; lastName: string };
    } | null;
  }) {
    return {
      id: note.id,
      trainerId: note.trainerId,
      enrollmentId: note.enrollmentId,
      batchId: note.batchId,
      sessionDate: note.sessionDate?.toISOString().split('T')[0] ?? null,
      title: note.title,
      content: note.content,
      isPrivate: note.isPrivate,
      batch: note.batch,
      enrollment: note.enrollment,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private formatLeaveRequest(leave: {
    id: string;
    trainerId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: LeaveRequestStatus;
    reviewNote: string | null;
    reviewedById: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: leave.id,
      trainerId: leave.trainerId,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      reason: leave.reason,
      status: leave.status,
      reviewNote: leave.reviewNote,
      reviewedById: leave.reviewedById,
      reviewedAt: leave.reviewedAt?.toISOString() ?? null,
      createdAt: leave.createdAt.toISOString(),
      updatedAt: leave.updatedAt.toISOString(),
    };
  }
}
