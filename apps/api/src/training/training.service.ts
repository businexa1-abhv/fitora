import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  PaymentEntityType,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { resolveSportId } from '../courts/utils/court.utils';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { AGE_GROUP_PRESETS, ageGroupLabel, calculateAge } from './constants/age-groups';
import {
  AssignTrainerDto,
  CreateBatchDto,
  CreateKidDto,
  CreateProgramDto,
  CreateProgressReportDto,
  EnrollKidDto,
  EnrollWithKidDto,
  MarkAttendanceDto,
  MarkBatchAttendanceDto,
  UpdateBatchDto,
  UpdateKidDto,
  UpdateProgramDto,
  UpdateProgressReportDto,
} from './dto/training.dto';

const PROGRAM_INCLUDE = {
  court: { select: { id: true, name: true, city: true } },
  sport: { select: { id: true, name: true, slug: true } },
  batches: {
    where: { isActive: true, deletedAt: null },
    include: {
      trainer: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
    },
  },
} as const;

const ENROLLMENT_INCLUDE = {
  kid: true,
  batch: {
    include: {
      program: { include: { court: { select: { id: true, name: true } }, sport: true } },
      trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} as const;

@Injectable()
export class TrainingService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Programs ───────────────────────────────────────────────────────────────

  async createProgram(courtId: string, dto: CreateProgramDto, user: AuthUserPayload) {
    const court = await this.prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');
    this.assertOwnerOrAdmin(court.ownerId, user);

    const sportId = await resolveSportId(this.prisma, {
      sportId: dto.sportId,
      sportSlug: dto.sportSlug,
      sportType: dto.sportType,
    });

    const program = await this.prisma.trainingProgram.create({
      data: {
        tenantId: court.tenantId,
        courtId,
        sportId,
        name: dto.name,
        description: dto.description,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        fee: dto.fee,
      },
      include: PROGRAM_INCLUDE,
    });

    return this.formatProgram(program);
  }

  async updateProgram(programId: string, dto: UpdateProgramDto, user: AuthUserPayload) {
    const program = await this.getProgramEntity(programId);
    this.assertOwnerOrAdmin(program.court.ownerId, user);

    const sportId = dto.sportId || dto.sportSlug || dto.sportType
      ? await resolveSportId(this.prisma, {
          sportId: dto.sportId,
          sportSlug: dto.sportSlug,
          sportType: dto.sportType,
        })
      : undefined;

    const updated = await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        name: dto.name,
        description: dto.description,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        fee: dto.fee,
        isActive: dto.isActive,
        ...(sportId && { sportId }),
      },
      include: PROGRAM_INCLUDE,
    });

    return this.formatProgram(updated);
  }

  async deleteProgram(programId: string, user: AuthUserPayload) {
    const program = await this.getProgramEntity(programId);
    this.assertOwnerOrAdmin(program.court.ownerId, user);

    await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: { isActive: false, deletedAt: new Date() },
    });

    return { success: true, id: programId };
  }

  async getProgram(programId: string) {
    const program = await this.prisma.trainingProgram.findFirst({
      where: { id: programId, deletedAt: null },
      include: PROGRAM_INCLUDE,
    });
    if (!program) throw new NotFoundException('Program not found');
    return this.formatProgram(program);
  }

  async getPrograms(courtId?: string) {
    const programs = await this.prisma.trainingProgram.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(courtId && { courtId }),
        court: { isApproved: true, isActive: true },
      },
      include: PROGRAM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return programs.map((p) => this.formatProgram(p));
  }

  getAgeGroupPresets() {
    return AGE_GROUP_PRESETS;
  }

  // ─── Batches & trainers ─────────────────────────────────────────────────────

  async getTrainers() {
    return this.prisma.user.findMany({
      where: { roles: { some: { role: UserRole.TRAINER } }, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  async createBatch(programId: string, dto: CreateBatchDto, user: AuthUserPayload) {
    const program = await this.getProgramEntity(programId);
    this.assertOwnerOrAdmin(program.court.ownerId, user);
    await this.assertTrainerExists(dto.trainerId);

    const batch = await this.prisma.trainingBatch.create({
      data: {
        programId,
        name: dto.name,
        schedule: dto.schedule,
        trainerId: dto.trainerId,
        maxCapacity: dto.maxCapacity ?? 20,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        program: { include: { sport: true, court: true } },
      },
    });

    return this.formatBatch(batch);
  }

  async updateBatch(batchId: string, dto: UpdateBatchDto, user: AuthUserPayload) {
    const batch = await this.getBatchEntity(batchId);
    this.assertOwnerOrAdmin(batch.program.court.ownerId, user);

    if (dto.trainerId) await this.assertTrainerExists(dto.trainerId);

    const updated = await this.prisma.trainingBatch.update({
      where: { id: batchId },
      data: {
        name: dto.name,
        schedule: dto.schedule,
        trainerId: dto.trainerId,
        maxCapacity: dto.maxCapacity,
        isActive: dto.isActive,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
        program: { include: { sport: true, court: true } },
      },
    });

    return this.formatBatch(updated);
  }

  async assignTrainer(batchId: string, dto: AssignTrainerDto, user: AuthUserPayload) {
    return this.updateBatch(batchId, { trainerId: dto.trainerId }, user);
  }

  // ─── Kid profiles ───────────────────────────────────────────────────────────

  async createKid(dto: CreateKidDto, parentId: string) {
    const kid = await this.prisma.kidProfile.create({
      data: {
        parentId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        school: dto.school,
        medicalNotes: dto.medicalNotes,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
      },
    });

    return this.formatKid(kid);
  }

  async updateKid(kidId: string, dto: UpdateKidDto, parentId: string) {
    const kid = await this.prisma.kidProfile.findFirst({
      where: { id: kidId, parentId, deletedAt: null },
    });
    if (!kid) throw new NotFoundException('Kid profile not found');

    const updated = await this.prisma.kidProfile.update({
      where: { id: kidId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        school: dto.school,
        medicalNotes: dto.medicalNotes,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
      },
    });

    return this.formatKid(updated);
  }

  async getMyKids(parentId: string) {
    const kids = await this.prisma.kidProfile.findMany({
      where: { parentId, deletedAt: null },
      include: {
        enrollments: {
          where: { deletedAt: null },
          include: ENROLLMENT_INCLUDE,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return kids.map((k) => this.formatKid(k));
  }

  // ─── Enrollment & payments ──────────────────────────────────────────────────

  async enroll(dto: EnrollKidDto, parentId: string) {
    const kid = await this.prisma.kidProfile.findFirst({
      where: { id: dto.kidId, parentId, deletedAt: null },
    });
    if (!kid) throw new NotFoundException('Kid profile not found');

    const batch = await this.getBatchForEnrollment(dto.batchId);
    this.validateKidAge(kid.dateOfBirth, batch.program);
    await this.validateBatchCapacity(batch);

    const existing = await this.prisma.trainingEnrollment.findUnique({
      where: { kidId_batchId: { kidId: dto.kidId, batchId: dto.batchId } },
    });

    if (existing && existing.status !== EnrollmentStatus.CANCELLED) {
      throw new BadRequestException('Already enrolled in this batch');
    }

    const fee = Number(batch.program.fee);

    const enrollment = existing
      ? await this.prisma.trainingEnrollment.update({
          where: { id: existing.id },
          data: {
            status: EnrollmentStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            amountPaid: fee,
          },
          include: ENROLLMENT_INCLUDE,
        })
      : await this.prisma.trainingEnrollment.create({
          data: {
            kidId: dto.kidId,
            batchId: dto.batchId,
            amountPaid: fee,
            status: EnrollmentStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
          },
          include: ENROLLMENT_INCLUDE,
        });

    const payment = await this.paymentsService.createPaymentOrder(
      parentId,
      fee,
      PaymentEntityType.TRAINING,
      enrollment.id,
    );

    return {
      enrollment: this.formatEnrollment(enrollment),
      payment,
      fee: batch.program.fee.toString(),
    };
  }

  async enrollWithNewKid(dto: EnrollWithKidDto, parentId: string) {
    const { batchId, couponCode: _coupon, ...kidDto } = dto;
    const kid = await this.createKid(kidDto, parentId);
    return this.enroll({ kidId: kid.id, batchId }, parentId);
  }

  /** Called by PaymentsService after successful payment */
  async confirmAfterPayment(enrollmentId: string) {
    const enrollment = await this.prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      },
      include: ENROLLMENT_INCLUDE,
    });

    await this.notificationsService.notifyTrainingEnrolled(enrollment.kid.parentId, {
      enrollmentId: enrollment.id,
      kidName: `${enrollment.kid.firstName} ${enrollment.kid.lastName}`,
      programName: enrollment.batch.program.name,
      batchName: enrollment.batch.name,
      schedule: enrollment.batch.schedule,
    });

    if (enrollment.batch.trainerId) {
      await this.notificationsService.notifyTrainerNewEnrollment(enrollment.batch.trainerId, {
        enrollmentId: enrollment.id,
        kidName: `${enrollment.kid.firstName} ${enrollment.kid.lastName}`,
        programName: enrollment.batch.program.name,
        batchName: enrollment.batch.name,
      });
    }

    return enrollment;
  }

  // ─── Attendance ─────────────────────────────────────────────────────────────

  async markAttendance(
    enrollmentId: string,
    dto: MarkAttendanceDto,
    user: AuthUserPayload,
  ) {
    const enrollment = await this.getEnrollmentEntity(enrollmentId);
    this.assertTrainerOfBatch(enrollment.batch.trainerId, user);

    const date = new Date(`${dto.date}T00:00:00.000Z`);

    const record = await this.prisma.attendanceRecord.upsert({
      where: { enrollmentId_date: { enrollmentId, date } },
      create: {
        enrollmentId,
        date,
        present: dto.present,
        notes: dto.notes,
        markedById: user.id,
      },
      update: {
        present: dto.present,
        notes: dto.notes,
        markedById: user.id,
      },
    });

    return record;
  }

  async markBatchAttendance(batchId: string, dto: MarkBatchAttendanceDto, user: AuthUserPayload) {
    const batch = await this.getBatchEntity(batchId);
    this.assertTrainerOfBatch(batch.trainerId, user);

    const date = new Date(`${dto.date}T00:00:00.000Z`);
    const results = [];

    for (const item of dto.records) {
      const enrollment = await this.prisma.trainingEnrollment.findFirst({
        where: { id: item.enrollmentId, batchId, status: EnrollmentStatus.ACTIVE },
      });
      if (!enrollment) continue;

      const record = await this.prisma.attendanceRecord.upsert({
        where: { enrollmentId_date: { enrollmentId: item.enrollmentId, date } },
        create: {
          enrollmentId: item.enrollmentId,
          date,
          present: item.present,
          notes: item.notes,
          markedById: user.id,
        },
        update: {
          present: item.present,
          notes: item.notes,
          markedById: user.id,
        },
      });
      results.push(record);
    }

    return { marked: results.length, records: results };
  }

  async getEnrollmentAttendance(enrollmentId: string, user: AuthUserPayload) {
    const enrollment = await this.getEnrollmentEntity(enrollmentId);
    this.assertEnrollmentAccess(enrollment, user);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { enrollmentId, deletedAt: null },
      orderBy: { date: 'desc' },
    });

    const present = records.filter((r) => r.present).length;
    const total = records.length;

    return {
      enrollmentId,
      records,
      summary: { present, absent: total - present, total, rate: total ? Math.round((present / total) * 100) : 0 },
    };
  }

  // ─── Progress reports ───────────────────────────────────────────────────────

  async createProgressReport(dto: CreateProgressReportDto, user: AuthUserPayload) {
    const enrollment = await this.getEnrollmentEntity(dto.enrollmentId);
    this.assertTrainerOfBatch(enrollment.batch.trainerId, user);

    const report = await this.prisma.progressReport.create({
      data: {
        enrollmentId: dto.enrollmentId,
        authorId: user.id,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        summary: dto.summary,
        skills: dto.skills ? (dto.skills as unknown as Prisma.InputJsonValue) : undefined,
        rating: dto.rating,
        isPublished: dto.publish ?? false,
        publishedAt: dto.publish ? new Date() : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        enrollment: { include: { kid: true, batch: { include: { program: true } } } },
      },
    });

    if (dto.publish) {
      await this.notificationsService.notifyProgressReport(
        enrollment.kid.parentId,
        {
          reportId: report.id,
          kidName: `${enrollment.kid.firstName} ${enrollment.kid.lastName}`,
          programName: enrollment.batch.program.name,
        },
      );
    }

    return this.formatProgressReport(report);
  }

  async publishProgressReport(reportId: string, user: AuthUserPayload) {
    const report = await this.prisma.progressReport.findFirst({
      where: { id: reportId, deletedAt: null },
      include: {
        enrollment: { include: { kid: true, batch: { include: { program: true } } } },
      },
    });
    if (!report) throw new NotFoundException('Progress report not found');

    this.assertTrainerOfBatch(report.enrollment.batch.trainerId, user);

    const updated = await this.prisma.progressReport.update({
      where: { id: reportId },
      data: { isPublished: true, publishedAt: new Date() },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        enrollment: { include: { kid: true, batch: { include: { program: true } } } },
      },
    });

    await this.notificationsService.notifyProgressReport(report.enrollment.kid.parentId, {
      reportId: updated.id,
      kidName: `${report.enrollment.kid.firstName} ${report.enrollment.kid.lastName}`,
      programName: report.enrollment.batch.program.name,
    });

    return this.formatProgressReport(updated);
  }

  async getProgressReports(enrollmentId: string, user: AuthUserPayload) {
    const enrollment = await this.getEnrollmentEntity(enrollmentId);
    this.assertEnrollmentAccess(enrollment, user);

    const isParent = enrollment.kid.parentId === user.id;

    const reports = await this.prisma.progressReport.findMany({
      where: {
        enrollmentId,
        deletedAt: null,
        ...(isParent && { isPublished: true }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { periodEnd: 'desc' },
    });

    return reports.map((r) => this.formatProgressReport(r));
  }

  // ─── Dashboards ─────────────────────────────────────────────────────────────

  async getParentDashboard(parentId: string) {
    const kids = await this.prisma.kidProfile.findMany({
      where: { parentId, deletedAt: null },
      include: {
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE, paymentStatus: PaymentStatus.PAID },
          include: ENROLLMENT_INCLUDE,
        },
      },
    });

    const activeEnrollments = kids.flatMap((k) => k.enrollments);
    const enrollmentIds = activeEnrollments.map((e) => e.id);

    const [attendanceSummary, recentReports] = await Promise.all([
      enrollmentIds.length
        ? this.prisma.attendanceRecord.groupBy({
            by: ['present'],
            where: { enrollmentId: { in: enrollmentIds }, deletedAt: null },
            _count: true,
          })
        : [],
      this.prisma.progressReport.findMany({
        where: {
          enrollmentId: { in: enrollmentIds },
          isPublished: true,
          deletedAt: null,
        },
        include: {
          enrollment: { include: { kid: true, batch: { include: { program: true } } } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),
    ]);

    const presentCount = attendanceSummary.find((a) => a.present)?._count ?? 0;
    const absentCount = attendanceSummary.find((a) => !a.present)?._count ?? 0;

    return {
      kidsCount: kids.length,
      activeEnrollments: activeEnrollments.length,
      ageGroupPresets: AGE_GROUP_PRESETS,
      attendance: { present: presentCount, absent: absentCount, total: presentCount + absentCount },
      kids: kids.map((k) => this.formatKid(k)),
      recentReports: recentReports.map((r) => this.formatProgressReport(r)),
    };
  }

  async getTrainerDashboard(trainerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await this.prisma.trainingBatch.findMany({
      where: { trainerId, isActive: true, deletedAt: null },
      include: {
        program: { include: { court: { select: { id: true, name: true } } } },
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          include: { kid: true },
        },
      },
    });

    const enrollmentIds = batches.flatMap((b) => b.enrollments.map((e) => e.id));

    const attendanceMarkedToday = enrollmentIds.length
      ? await this.prisma.attendanceRecord.count({
          where: { enrollmentId: { in: enrollmentIds }, date: today },
        })
      : 0;

    return {
      batchCount: batches.length,
      activeStudents: enrollmentIds.length,
      attendanceMarkedToday,
      pendingAttendance: Math.max(0, enrollmentIds.length - attendanceMarkedToday),
      batches: batches.map((b) => this.formatBatch(b)),
      ageGroupPresets: AGE_GROUP_PRESETS,
    };
  }

  async getOwnerDashboard(user: AuthUserPayload) {
    const programs = await this.prisma.trainingProgram.findMany({
      where: { court: { ownerId: user.id }, deletedAt: null },
      include: {
        court: { select: { id: true, name: true } },
        batches: {
          where: { deletedAt: null },
          include: { _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } } },
        },
        _count: { select: { batches: true } },
      },
    });

    const revenue = await this.prisma.trainingEnrollment.aggregate({
      where: {
        paymentStatus: PaymentStatus.PAID,
        batch: { program: { court: { ownerId: user.id } } },
      },
      _sum: { amountPaid: true },
      _count: true,
    });

    const activeEnrollments = await this.prisma.trainingEnrollment.count({
      where: {
        status: EnrollmentStatus.ACTIVE,
        batch: { program: { court: { ownerId: user.id } } },
      },
    });

    return {
      totalPrograms: programs.length,
      activePrograms: programs.filter((p) => p.isActive).length,
      activeEnrollments,
      totalRevenue: Number(revenue._sum.amountPaid ?? 0),
      totalEnrollments: revenue._count,
      ageGroupPresets: AGE_GROUP_PRESETS,
      programs: programs.map((p) => ({
        ...this.formatProgram(p as never),
        batchCount: p._count.batches,
        activeStudents: p.batches.reduce((sum, b) => sum + b._count.enrollments, 0),
      })),
    };
  }

  async getTrainerBatches(trainerId: string) {
    const batches = await this.prisma.trainingBatch.findMany({
      where: { trainerId, isActive: true, deletedAt: null },
      include: {
        program: { include: { court: { select: { id: true, name: true } }, sport: true } },
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          include: { kid: true },
        },
      },
    });

    return batches.map((b) => this.formatBatch(b));
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async getProgramEntity(programId: string) {
    const program = await this.prisma.trainingProgram.findFirst({
      where: { id: programId, deletedAt: null },
      include: { court: true },
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  private async getBatchEntity(batchId: string) {
    const batch = await this.prisma.trainingBatch.findFirst({
      where: { id: batchId, deletedAt: null },
      include: { program: { include: { court: true } } },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  private async getBatchForEnrollment(batchId: string) {
    const batch = await this.prisma.trainingBatch.findFirst({
      where: { id: batchId, isActive: true, deletedAt: null },
      include: {
        program: true,
        _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
      },
    });
    if (!batch || !batch.program.isActive) throw new NotFoundException('Batch not found');
    return batch;
  }

  private async getEnrollmentEntity(enrollmentId: string) {
    const enrollment = await this.prisma.trainingEnrollment.findFirst({
      where: { id: enrollmentId, deletedAt: null },
      include: ENROLLMENT_INCLUDE,
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  private async assertTrainerExists(trainerId: string) {
    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId, roles: { some: { role: UserRole.TRAINER } }, isActive: true },
    });
    if (!trainer) throw new BadRequestException('Invalid trainer');
  }

  private validateKidAge(dob: Date, program: { minAge: number; maxAge: number }) {
    const age = calculateAge(dob);
    if (age < program.minAge || age > program.maxAge) {
      throw new BadRequestException(
        `Child must be ${ageGroupLabel(program.minAge, program.maxAge)} (${program.minAge}–${program.maxAge} years). Current age: ${age}`,
      );
    }
  }

  private async validateBatchCapacity(
    batch: { maxCapacity: number; _count: { enrollments: number } },
  ) {
    if (batch._count.enrollments >= batch.maxCapacity) {
      throw new BadRequestException('Batch is full');
    }
  }

  private assertOwnerOrAdmin(ownerId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) || user.id === ownerId) return;
    throw new ForbiddenException('Insufficient permissions');
  }

  private assertTrainerOfBatch(trainerId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) || user.id === trainerId) return;
    throw new ForbiddenException('Only assigned trainer can perform this action');
  }

  private assertEnrollmentAccess(
    enrollment: { kid: { parentId: string }; batch: { trainerId: string } },
    user: AuthUserPayload,
  ) {
    const isParent = enrollment.kid.parentId === user.id;
    const isTrainer = enrollment.batch.trainerId === user.id;
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    if (!isParent && !isTrainer && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }
  }

  private formatProgram(
    program: Prisma.TrainingProgramGetPayload<{ include: typeof PROGRAM_INCLUDE }>,
  ) {
    return {
      ...program,
      fee: program.fee.toString(),
      ageGroupLabel: ageGroupLabel(program.minAge, program.maxAge),
      sportType: program.sport?.slug?.toUpperCase().replace(/-/g, '_') ?? null,
      batches: program.batches?.map((b) => this.formatBatch(b)),
    };
  }

  private formatBatch(batch: Record<string, unknown>): Record<string, unknown> {
    const enrollments = batch.enrollments as Array<Record<string, unknown>> | undefined;
    return {
      ...batch,
      enrollments: enrollments?.map((e) => this.formatEnrollment(e)),
    };
  }

  private formatKid(
    kid: Prisma.KidProfileGetPayload<{
      include?: { enrollments?: { include: typeof ENROLLMENT_INCLUDE } };
    }>,
  ) {
    const kidWithEnrollments = kid as typeof kid & {
      enrollments?: Array<Record<string, unknown>>;
    };
    return {
      ...kid,
      dateOfBirth: kid.dateOfBirth.toISOString().split('T')[0],
      age: calculateAge(kid.dateOfBirth),
      enrollments: kidWithEnrollments.enrollments?.map((e) => this.formatEnrollment(e)),
    };
  }

  private formatEnrollment(enrollment: Record<string, unknown>): Record<string, unknown> {
    const e = enrollment as {
      amountPaid: { toString(): string };
      batch?: Record<string, unknown>;
      kid?: { dateOfBirth: Date; [key: string]: unknown };
    };
    return {
      ...enrollment,
      amountPaid: e.amountPaid.toString(),
      batch: e.batch ? this.formatBatch(e.batch) : undefined,
      kid: e.kid
        ? { ...e.kid, dateOfBirth: e.kid.dateOfBirth.toISOString().split('T')[0] }
        : undefined,
    };
  }

  private formatProgressReport(report: Record<string, unknown>) {
    const r = report as {
      periodStart: Date;
      periodEnd: Date;
      publishedAt?: Date | null;
      [key: string]: unknown;
    };
    return {
      ...report,
      periodStart: r.periodStart.toISOString().split('T')[0],
      periodEnd: r.periodEnd.toISOString().split('T')[0],
      publishedAt: r.publishedAt?.toISOString() ?? null,
    };
  }
}
