import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { closeTestApp, createTestApp } from '../helpers/create-test-app';

describe('Auth API (integration)', () => {
  let app: INestApplication;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    getPermissions: jest.fn(),
    registerWithOtp: jest.fn(),
    loginWithPhone: jest.fn(),
    loginWithGoogle: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    logoutAll: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const fixture = await createTestApp({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    });
    app = fixture.app;
  });

  afterEach(async () => closeTestApp(app));

  it('POST /api/v1/auth/login delegates to service', async () => {
    authService.login.mockResolvedValue({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      user: { id: 'u1', email: 'p@f.com', roles: ['PLAYER'] },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'p@f.com', password: 'SecurePass123!' })
      .expect(200);

    expect(res.body.tokens.accessToken).toBe('at');
    expect(authService.login).toHaveBeenCalled();
  });

  it('POST /api/v1/auth/login rejects invalid body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('GET /api/v1/auth/me requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('GET /api/v1/auth/me returns profile for authenticated user', async () => {
    authService.getMe.mockResolvedValue({
      id: 'player-1',
      email: 'player@fitora.com',
      roles: ['PLAYER'],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.id).toBe('player-1');
    expect(authService.getMe).toHaveBeenCalledWith('player-1');
  });

  it('GET /api/v1/auth/permissions returns roles and permissions', async () => {
    authService.getPermissions.mockResolvedValue({
      roles: ['PLAYER'],
      permissions: ['bookings:read'],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/permissions')
      .set('x-test-role', 'player')
      .expect(200);

    expect(res.body.permissions).toContain('bookings:read');
  });

  it('POST /api/v1/auth/refresh is public', async () => {
    authService.refresh.mockResolvedValue({
      tokens: { accessToken: 'new', refreshToken: 'new-rt' },
      user: { id: 'u1' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'old-rt' })
      .expect(200);
  });

  it('POST /api/v1/auth/otp/send delegates to service', async () => {
    authService.sendOtp.mockResolvedValue({ message: 'OTP sent', expiresIn: 300 });

    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '9876543210', purpose: 'LOGIN' })
      .expect(200);
  });

  it('POST /api/v1/auth/otp/verify validates body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '9876543210' })
      .expect(400);
  });

  it('POST /api/v1/auth/logout revokes session', async () => {
    authService.logout.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('x-test-role', 'player')
      .send({ refreshToken: 'rt' })
      .expect(204);
  });
});

describe('AuthController (unit)', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
            login: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get(AuthController);
  });

  it('register calls authService.register', async () => {
    const result = await controller.register({
      email: 'new@f.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
    });
    expect(result.user.id).toBe('u1');
  });
});
