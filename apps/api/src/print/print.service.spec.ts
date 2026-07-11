import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrintService } from './print.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';

describe('PrintService', () => {
  let service: PrintService;
  let prisma: jest.Mocked<
    Pick<PrismaService, 'printDesign' | 'printListing' | 'printOrder' | 'user'>
  >;

  beforeEach(async () => {
    prisma = {
      printDesign: { create: jest.fn(), findUnique: jest.fn() },
      printListing: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn() },
      printOrder: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn() },
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: { createPaymentOrder: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyPrintOrderUpdate: jest.fn() } },
      ],
    }).compile();

    service = module.get(PrintService);
  });

  it('returns print options', () => {
    const options = service.getOptions();
    expect(options.sizes).toContain('M');
    expect(options.colors.length).toBeGreaterThan(0);
  });

  describe('uploadDesign', () => {
    it('rejects non-image mime types', async () => {
      await expect(
        service.uploadDesign('user-1', {
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          dataBase64: 'abc',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
