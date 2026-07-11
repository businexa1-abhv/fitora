import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.module';
import { RedisService } from '../common/redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;
  const redisService = {
    isAvailable: jest.fn().mockReturnValue(true),
    usesMemoryFallback: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();
    controller = module.get(HealthController);
  });

  it('liveness returns ok', () => {
    expect(controller.check().status).toBe('ok');
  });

  it('readiness returns ok when database is up', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
    const result = await controller.ready();
    expect(result.status).toBe('ok');
  });

  it('readiness throws when database is down', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
