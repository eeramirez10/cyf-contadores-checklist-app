import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private refreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite:
        this.configService.get<CookieOptions['sameSite']>(
          'app.authCookieSameSite',
        ) ?? 'lax',
      secure: this.configService.get<boolean>('app.authCookieSecure') ?? false,
      domain: this.configService.get<string>('app.authCookieDomain'),
      path: '/api/v1/auth',
    };
  }
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password);
    response.cookie(
      'refresh_token',
      tokens.refreshToken,
      this.refreshCookieOptions(),
    );
    return { accessToken: tokens.accessToken };
  }
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookie: unknown = request.cookies?.refresh_token;
    const refreshToken = typeof cookie === 'string' ? cookie : '';
    const tokens = await this.authService.refresh(refreshToken);
    response.cookie(
      'refresh_token',
      tokens.refreshToken,
      this.refreshCookieOptions(),
    );
    return { accessToken: tokens.accessToken };
  }
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookie: unknown = request.cookies?.refresh_token;
    await this.authService.logout(
      typeof cookie === 'string' ? cookie : undefined,
    );
    response.clearCookie('refresh_token', this.refreshCookieOptions());
  }
  @Get('me') me(@Req() request: Request & { user: unknown }) {
    return request.user;
  }
}
