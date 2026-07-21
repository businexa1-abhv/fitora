import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, WaitlistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { SlotAvailabilityService } from '../availability/services/slot-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SlotEventsService } from '../realtime/slot-events.service';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';

const OFFER_TTL_MS = 5 * 60_000;
const ACTIVE_WAITLIST = [WaitlistStatus.WAITING, WaitlistStatus.OFFERED] as const;

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
    @Inject(SlotAvailabilityService)
    private availability: SlotAvailabilityService,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
    private events: SlotEventsService,
  ) {}

  async join(courtId: string, slotId: string, userId: string, seats = 1) {
    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, courtId, deletedAt: null },
      include: { court: { select: { name: true, isActive: true, isApproved: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (!slot.court.isActive || !slot.court.isApproved) {
      throw new BadRequestException('Court is not available for bookings');
    }
    if (slot.isBlocked) {
      throw new BadRequestException('Slot is blocked and cannot accept waitlist entries');
    }

    const available = this.availability.availableSeats(slot);
    if (available >= seats) {
      throw new BadRequestException('Slot still has availability — book directly instead');
    }

    const existing = await this.prisma.slotWaitlistEntry.findFirst({
      where: {
        slotId,
        userId,
        deletedAt: null,
        status: { in: [...ACTIVE_WAITLIST] },
      },
    });
    if (existing) {
      throw new BadRequestException('You are already on the waitlist for this slot');
    }

    const waitingCount = await this.prisma.slotWaitlistEntry.count({
      where: { slotId, deletedAt: null, status: WaitlistStatus.WAITING },
    });

    const entry = await this.prisma.slotWaitlistEntry.create({
      data: {
        slotId,
        courtId,
        userId,
        seats,
        position: waitingCount + 1,
        status: WaitlistStatus.WAITING,
      },
      include: this.entryInclude(),
    });

    return this.formatEntry(entry);
  }

  async leave(id: string, userId: string) {
    const entry = await this.prisma.slotWaitlistEntry.findFirst({
      where: { id, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only leave your own waitlist entries');
    }
    if (!ACTIVE_WAITLIST.includes(entry.status as (typeof ACTIVE_WAITLIST)[number])) {
      throw new BadRequestException('Waitlist entry is no longer active');
    }

    await this.prisma.slotWaitlistEntry.update({
      where: { id },
      data: { status: WaitlistStatus.CANCELLED, deletedAt: new Date() },
    });

    await this.reindexPositions(entry.slotId);

    return { success: true, id };
  }

  async getMyEntries(userId: string) {
    const entries = await this.prisma.slotWaitlistEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: [...ACTIVE_WAITLIST, WaitlistStatus.CONVERTED] },
      },
      include: this.entryInclude(),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return entries.map((entry) => this.formatEntry(entry));
  }

  async getSlotWaitlist(courtId: string, slotId: string, user: AuthUserPayload) {
    const court = await this.prisma.court.findFirst({
      where: { id: courtId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!court) throw new NotFoundException('Court not found');
    if (court.ownerId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Only the court owner can view the waitlist');
    }

    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, courtId, deletedAt: null },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    const entries = await this.prisma.slotWaitlistEntry.findMany({
      where: {
        slotId,
        deletedAt: null,
        status: { in: [...ACTIVE_WAITLIST] },
      },
      include: this.entryInclude(),
      orderBy: { position: 'asc' },
    });

    return entries.map((entry) => this.formatEntry(entry));
  }

  /** Expire stale offers and promote the next waiting player. */
  async expireStaleOffers() {
    const now = new Date();
    const expired = await this.prisma.slotWaitlistEntry.findMany({
      where: {
        deletedAt: null,
        status: WaitlistStatus.OFFERED,
        offeredUntil: { lt: now },
      },
    });

    for (const entry of expired) {
      await this.prisma.slotWaitlistEntry.update({
        where: { id: entry.id },
        data: { status: WaitlistStatus.EXPIRED },
      });
      await this.offerNext(entry.slotId, entry.courtId);
    }

    return { expired: expired.length };
  }

  /** Called when seats are freed after a cancellation. */
  async offerNext(slotId: string, courtId: string, freedSeats = 1) {
    await this.expireStaleOffersForSlot(slotId);

    const slot = await this.prisma.courtSlot.findFirst({
      where: { id: slotId, deletedAt: null },
    });
    if (!slot || slot.isBlocked) return null;

    const available = this.availability.availableSeats(slot);
    if (available < freedSeats) return null;

    const next = await this.prisma.slotWaitlistEntry.findFirst({
      where: {
        slotId,
        courtId,
        deletedAt: null,
        status: WaitlistStatus.WAITING,
      },
      orderBy: { position: 'asc' },
      include: {
        slot: { select: { startTime: true, endTime: true } },
        court: { select: { name: true } },
      },
    });
    if (!next) return null;

    const offeredUntil = new Date(Date.now() + OFFER_TTL_MS);
    const updated = await this.prisma.slotWaitlistEntry.update({
      where: { id: next.id },
      data: { status: WaitlistStatus.OFFERED, offeredUntil },
      include: this.entryInclude(),
    });

    await this.notifications.notifyWaitlistOffer(next.userId, {
      waitlistId: next.id,
      courtName: next.court.name,
      slotStart: next.slot.startTime,
      offeredUntil,
    });

    await this.events.emitWaitlistPromoted({
      waitlistEntryId: next.id,
      userId: next.userId,
      slotId,
      courtId,
      seats: next.seats,
    });

    return this.formatEntry(updated);
  }

  /** Mark waitlist entry converted when player books after receiving an offer. */
  async markConverted(slotId: string, userId: string) {
    const offered = await this.prisma.slotWaitlistEntry.findFirst({
      where: {
        slotId,
        userId,
        deletedAt: null,
        status: WaitlistStatus.OFFERED,
        offeredUntil: { gte: new Date() },
      },
    });
    if (!offered) return null;

    await this.prisma.slotWaitlistEntry.update({
      where: { id: offered.id },
      data: { status: WaitlistStatus.CONVERTED, offeredUntil: null },
    });
    return offered.id;
  }

  private async expireStaleOffersForSlot(slotId: string) {
    const now = new Date();
    const stale = await this.prisma.slotWaitlistEntry.findMany({
      where: {
        slotId,
        deletedAt: null,
        status: WaitlistStatus.OFFERED,
        offeredUntil: { lt: now },
      },
    });

    for (const entry of stale) {
      await this.prisma.slotWaitlistEntry.update({
        where: { id: entry.id },
        data: { status: WaitlistStatus.EXPIRED },
      });
    }
  }

  private async reindexPositions(slotId: string) {
    const waiting = await this.prisma.slotWaitlistEntry.findMany({
      where: { slotId, deletedAt: null, status: WaitlistStatus.WAITING },
      orderBy: { position: 'asc' },
    });

    await Promise.all(
      waiting.map((entry, index) =>
        this.prisma.slotWaitlistEntry.update({
          where: { id: entry.id },
          data: { position: index + 1 },
        }),
      ),
    );
  }

  private entryInclude() {
    return {
      slot: { select: { id: true, startTime: true, endTime: true, price: true } },
      court: { select: { id: true, name: true, city: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    } as const;
  }

  private formatEntry(entry: {
    id: string;
    slotId: string;
    courtId: string;
    userId: string;
    seats: number;
    status: WaitlistStatus;
    offeredUntil: Date | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    slot: { id: string; startTime: Date; endTime: Date; price: unknown };
    court: { id: string; name: string; city: string };
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  }) {
    return {
      id: entry.id,
      slotId: entry.slotId,
      courtId: entry.courtId,
      userId: entry.userId,
      seats: entry.seats,
      status: entry.status,
      position: entry.position,
      offeredUntil: entry.offeredUntil?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      slot: {
        id: entry.slot.id,
        startTime: entry.slot.startTime.toISOString(),
        endTime: entry.slot.endTime.toISOString(),
        price: String(entry.slot.price),
      },
      court: entry.court,
      user: entry.user,
    };
  }
}
