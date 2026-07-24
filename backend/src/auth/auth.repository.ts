import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfileByEmail(email: string) {
    return this.prisma.profiles.findUnique({ where: { email } });
  }

  findProfileById(id: string) {
    return this.prisma.profiles.findUnique({ where: { id } });
  }

  createSession(profileId: string, refreshTokenHash: string, expiresAt: Date) {
    return this.prisma.auth_sessions.create({
      data: {
        profile_id: profileId,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
      },
    });
  }

  findSession(id: string) {
    return this.prisma.auth_sessions.findUnique({ where: { id } });
  }

  rotateSession(id: string, refreshTokenHash: string, expiresAt: Date) {
    return this.prisma.auth_sessions.update({
      where: { id },
      data: {
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
        revoked_at: null,
      },
    });
  }

  revokeSession(id: string) {
    return this.prisma.auth_sessions.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
  }
}
