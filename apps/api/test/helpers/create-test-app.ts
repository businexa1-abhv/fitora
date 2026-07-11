import { INestApplication, ValidationPipe, type Provider, type Type } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { PermissivePermissionsGuard } from './permissive-permissions.guard';
import { TestAuthGuard } from './test-auth.guard';

export async function createTestApp(options: {
  controllers: Type[];
  providers?: Provider[];
}): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule({
    controllers: options.controllers,
    providers: [
      Reflector,
      ...(options.providers ?? []),
      { provide: APP_GUARD, useClass: TestAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_GUARD, useClass: PermissivePermissionsGuard },
    ],
  }).compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return { app, module };
}

export async function closeTestApp(app: INestApplication) {
  await app.close();
}
