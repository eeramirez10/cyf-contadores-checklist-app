import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: { login: jest.Mock; logout: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login: jest.fn(), logout: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    authController = module.get(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
  });

  it('sets a secure cross-site refresh cookie when configured', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'app.authCookieDomain': 'api.example.com',
        'app.authCookieSameSite': 'none',
        'app.authCookieSecure': true,
      };
      return values[key];
    });
    const response = { cookie: jest.fn() };

    await expect(
      authController.login(
        { email: 'admin@example.com', password: 'valid-password' },
        response as never,
      ),
    ).resolves.toEqual({ accessToken: 'access-token' });

    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        domain: 'api.example.com',
        path: '/api/v1/auth',
      },
    );
  });

  it('clears the refresh cookie with the same configured options', async () => {
    configService.get.mockReturnValueOnce('lax').mockReturnValueOnce(false);
    const response = { clearCookie: jest.fn() };

    await authController.logout(
      { cookies: { refresh_token: 'session.secret' } } as never,
      response as never,
    );

    expect(authService.logout).toHaveBeenCalledWith('session.secret');
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      domain: undefined,
      path: '/api/v1/auth',
    });
  });
});
