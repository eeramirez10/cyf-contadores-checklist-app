import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  apiName: process.env.API_NAME ?? 'cyf-backend',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3002', 10),
}));
