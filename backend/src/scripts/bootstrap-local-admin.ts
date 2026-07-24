import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const email =
      requiredEnvironmentVariable('LOCAL_ADMIN_EMAIL').toLowerCase();
    const password = requiredEnvironmentVariable('LOCAL_ADMIN_PASSWORD');
    const prisma = app.get(PrismaService);
    const profile = await prisma.profiles.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (!profile) {
      throw new Error(`No profile exists for ${email}`);
    }
    if (profile.role !== 'ADMIN') {
      throw new Error(`Profile ${email} is not an administrator`);
    }

    const passwordHash = await argon2.hash(password);
    const now = new Date();

    await prisma.$transaction([
      prisma.profiles.update({
        where: { id: profile.id },
        data: {
          password_hash: passwordHash,
          password_changed_at: now,
          is_active: true,
        },
      }),
      prisma.auth_sessions.updateMany({
        where: { profile_id: profile.id, revoked_at: null },
        data: { revoked_at: now },
      }),
    ]);

    console.log(`Local password configured for ${email}`);
  } finally {
    await app.close();
  }
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unable to configure local admin: ${message}`);
  process.exitCode = 1;
});
