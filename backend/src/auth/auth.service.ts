import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AuthRepository } from './auth.repository';

type AccessPayload = { sub: string; role: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const profile = await this.authRepository.findProfileByEmail(
      email.toLowerCase(),
    );
    if (
      !profile?.password_hash ||
      !profile.is_active ||
      !(await argon2.verify(profile.password_hash, password))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(profile.id, profile.role);
  }

  async refresh(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split('.');
    if (!sessionId || !secret)
      throw new UnauthorizedException('Invalid refresh token');
    const session = await this.authRepository.findSession(sessionId);
    if (
      !session ||
      session.revoked_at ||
      session.expires_at <= new Date() ||
      !(await argon2.verify(session.refresh_token_hash, secret))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const profile = await this.authRepository.findProfileById(
      session.profile_id,
    );
    if (!profile?.is_active)
      throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(profile.id, profile.role, session.id);
  }

  async logout(refreshToken?: string) {
    const sessionId = refreshToken?.split('.')[0];
    if (sessionId)
      await this.authRepository.revokeSession(sessionId).catch(() => undefined);
  }

  async validateAccessToken(token: string) {
    let payload: AccessPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessPayload>(token, {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token expirado o invalido');
    }
    const profile = await this.authRepository.findProfileById(payload.sub);
    if (!profile?.is_active) throw new UnauthorizedException();
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      name: profile.name,
    };
  }

  private async issueTokens(
    profileId: string,
    role: string,
    sessionId?: string,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { sub: profileId, role },
      {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_ACCESS_TTL'),
      },
    );
    const refreshSecret = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() +
        Number(this.configService.getOrThrow('JWT_REFRESH_TTL_DAYS')) *
          86400000,
    );
    const hash = await argon2.hash(refreshSecret);
    const session = sessionId
      ? await this.authRepository.rotateSession(sessionId, hash, expiresAt)
      : await this.authRepository.createSession(profileId, hash, expiresAt);
    return { accessToken, refreshToken: `${session.id}.${refreshSecret}` };
  }
}
