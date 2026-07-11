import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CourtApprovalStatus, UserRole } from '@prisma/client';
import { CourtsService } from './courts.service';
import { PrismaService } from '../prisma/prisma.module';
import { CacheService } from '../common/redis/cache.service';
import { mockCacheService } from '../../test/helpers/mock-deps';

describe('CourtsService', () => {
  let service: CourtsService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      'court' | 'sport' | 'courtImage' | 'courtSlot' | 'booking' | 'auditLog'
    >
  >;

  const ownerUser = {
    id: 'owner-1',
    email: 'owner@fitora.com',
    roles: [UserRole.COURT_OWNER],
  };

  const adminUser = {
    id: 'admin-1',
    email: 'admin@fitora.com',
    roles: [UserRole.ADMIN],
  };

  const playerUser = {
    id: 'player-1',
    email: 'player@fitora.com',
    roles: [UserRole.PLAYER],
  };

  const mockSport = {
    id: 'sport-1',
    name: 'Badminton',
    slug: 'badminton',
    iconUrl: null,
    deletedAt: null,
    isActive: true,
  };

  const mockCourt = {
    id: 'court-1',
    ownerId: 'owner-1',
    sportId: 'sport-1',
    name: 'Test Arena',
    slug: 'test-arena-bangalore',
    description: null,
    address: 'MG Road',
    city: 'Bangalore',
    state: null,
    pincode: null,
    latitude: null,
    longitude: null,
    amenities: ['Parking'],
    rules: null,
    defaultSlotPrice: null,
    approvalStatus: CourtApprovalStatus.PENDING,
    rejectionReason: null,
    approvedAt: null,
    rejectedAt: null,
    isApproved: false,
    isActive: true,
    averageRating: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: { id: 'owner-1', firstName: 'Court', lastName: 'Owner', email: 'owner@fitora.com' },
    sport: mockSport,
    images: [],
  };

  beforeEach(async () => {
    prisma = {
      court: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      sport: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      courtImage: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      courtSlot: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: mockCacheService() },
      ],
    }).compile();

    service = module.get(CourtsService);
  });

  describe('create', () => {
    it('creates a court with pending approval status', async () => {
      prisma.sport.findFirst.mockResolvedValue(mockSport as never);
      prisma.court.findUnique.mockResolvedValue(null);
      prisma.court.create.mockResolvedValue(mockCourt as never);
      prisma.auditLog.create.mockResolvedValue({} as never);

      const result = await service.create(
        {
          name: 'Test Arena',
          sportSlug: 'badminton',
          address: 'MG Road',
          city: 'Bangalore',
          amenities: ['Parking'],
        },
        'owner-1',
      );

      expect(prisma.court.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvalStatus: CourtApprovalStatus.PENDING,
            isApproved: false,
            sportId: 'sport-1',
          }),
        }),
      );
      expect(result.approvalStatus).toBe(CourtApprovalStatus.PENDING);
    });

    it('rejects invalid amenities', async () => {
      prisma.sport.findFirst.mockResolvedValue(mockSport as never);

      await expect(
        service.create(
          {
            name: 'Test Arena',
            sportSlug: 'badminton',
            address: 'MG Road',
            city: 'Bangalore',
            amenities: ['Invalid Amenity'],
          },
          'owner-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires sportId or sportSlug', async () => {
      await expect(
        service.create(
          { name: 'Test Arena', address: 'MG Road', city: 'Bangalore' },
          'owner-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('approves a pending court', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.court.update.mockResolvedValue({
        ...mockCourt,
        approvalStatus: CourtApprovalStatus.APPROVED,
        isApproved: true,
      } as never);
      prisma.auditLog.create.mockResolvedValue({} as never);

      const result = await service.approve('court-1', 'admin-1');

      expect(result.approvalStatus).toBe(CourtApprovalStatus.APPROVED);
      expect(prisma.court.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ approvalStatus: CourtApprovalStatus.APPROVED }),
        }),
      );
    });

    it('throws when court already approved', async () => {
      prisma.court.findFirst.mockResolvedValue({
        ...mockCourt,
        approvalStatus: CourtApprovalStatus.APPROVED,
      } as never);

      await expect(service.approve('court-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('rejects a court with reason', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.court.update.mockResolvedValue({
        ...mockCourt,
        approvalStatus: CourtApprovalStatus.REJECTED,
        rejectionReason: 'Incomplete info',
      } as never);
      prisma.auditLog.create.mockResolvedValue({} as never);

      const result = await service.reject('court-1', { reason: 'Incomplete info' }, 'admin-1');

      expect(result.approvalStatus).toBe(CourtApprovalStatus.REJECTED);
    });
  });

  describe('findOne', () => {
    it('hides unapproved courts from public users', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);

      await expect(service.findOne('court-1', playerUser)).rejects.toThrow(NotFoundException);
    });

    it('allows owner to view pending court', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);

      const result = await service.findOne('court-1', ownerUser);
      expect(result.id).toBe('court-1');
    });
  });

  describe('update', () => {
    it('resubmits rejected court to pending on owner update', async () => {
      prisma.court.findFirst.mockResolvedValue({
        ...mockCourt,
        approvalStatus: CourtApprovalStatus.REJECTED,
      } as never);
      prisma.court.update.mockResolvedValue({
        ...mockCourt,
        approvalStatus: CourtApprovalStatus.PENDING,
      } as never);
      prisma.auditLog.create.mockResolvedValue({} as never);

      await service.update('court-1', { description: 'Updated' }, ownerUser);

      expect(prisma.court.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ approvalStatus: CourtApprovalStatus.PENDING }),
        }),
      );
    });

    it('forbids non-owner updates', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);

      await expect(
        service.update('court-1', { description: 'Hack' }, playerUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('soft-deletes a court', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt as never);
      prisma.court.update.mockResolvedValue({ ...mockCourt, deletedAt: new Date() } as never);
      prisma.auditLog.create.mockResolvedValue({} as never);

      const result = await service.remove('court-1', ownerUser);

      expect(result.success).toBe(true);
      expect(prisma.court.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('getAmenities', () => {
    it('returns curated amenity list', () => {
      const result = service.getAmenities();
      expect(result.items).toContain('Parking');
      expect(result.items).toContain('AC');
    });
  });
});
