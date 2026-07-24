import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  apiName: process.env.API_NAME ?? 'cyf-backend',
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
  authCookieSameSite: process.env.AUTH_COOKIE_SAME_SITE ?? 'lax',
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3002', 10),
}));
