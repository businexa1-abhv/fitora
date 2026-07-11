import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(async () => {
    mockVerifyIdToken.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('google-client-id') },
        },
      ],
    }).compile();

    service = module.get(GoogleAuthService);
  });

  it('maps Google token payload to user info', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email: 'user@gmail.com',
        given_name: 'Jane',
        family_name: 'Doe',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
      }),
    });

    const result = await service.verifyIdToken('valid-id-token');

    expect(result).toEqual({
      googleId: 'google-123',
      email: 'user@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      emailVerified: true,
    });
  });

  it('throws when Google is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    const unconfigured = module.get(GoogleAuthService);

    await expect(unconfigured.verifyIdToken('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
