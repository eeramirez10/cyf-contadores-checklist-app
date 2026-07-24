import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3002),
        API_NAME: Joi.string().min(1).default('cyf-backend'),
        CORS_ORIGINS: Joi.string().min(1).required(),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ['postgres', 'postgresql'] })
          .required(),
        DIRECT_URL: Joi.string()
          .uri({ scheme: ['postgres', 'postgresql'] })
          .required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TTL: Joi.string().default('15m'),
        JWT_REFRESH_TTL_DAYS: Joi.number().integer().min(1).default(30),
      }),
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),
    AuthModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
