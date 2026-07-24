import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let authRepository: {
    createSession: jest.Mock;
    findProfileByEmail: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            createSession: jest.fn(),
            findProfileByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string | number> = {
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_ACCESS_TTL: '15m',
                JWT_REFRESH_TTL_DAYS: 30,
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    authRepository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
  });

  it('issues tokens for an active profile with a valid local password', async () => {
    authRepository.findProfileByEmail.mockResolvedValue({
      id: '1a26ec6d-44e6-49a0-b93f-2c5b1d2a47d2',
      role: 'ADMIN',
      is_active: true,
      password_hash: await argon2.hash('valid-password'),
    });
    authRepository.createSession.mockResolvedValue({ id: 'session-id' });
    jwtService.signAsync.mockResolvedValue('access-token');

    const tokens = await authService.login(
      'ADMIN@EXAMPLE.COM',
      'valid-password',
    );

    expect(tokens.accessToken).toBe('access-token');
    expect(tokens.refreshToken).toMatch(/^session-id\./);

    expect(authRepository.findProfileByEmail).toHaveBeenCalledWith(
      'admin@example.com',
    );
  });

  it('rejects invalid local credentials without issuing a session', async () => {
    authRepository.findProfileByEmail.mockResolvedValue(null);

    await expect(
      authService.login('admin@example.com', 'invalid-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authRepository.createSession).not.toHaveBeenCalled();
  });
});
