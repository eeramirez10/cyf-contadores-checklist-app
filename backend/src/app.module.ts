import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ChecklistModule } from './checklist/checklist.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { CatalogModule } from './catalog/catalog.module';
import { CompaniesModule } from './companies/companies.module';
import { DocumentsModule } from './documents/documents.module';
import { TemplatesModule } from './templates/templates.module';
import { AssignmentsModule } from './assignments/assignments.module';

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
        AUTH_COOKIE_SECURE: Joi.boolean()
          .truthy('true')
          .falsy('false')
          .default(false),
        AUTH_COOKIE_SAME_SITE: Joi.string()
          .valid('lax', 'strict', 'none')
          .default('lax'),
        AUTH_COOKIE_DOMAIN: Joi.string().hostname().optional(),
        PUBLIC_BASE_URL: Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .allow('')
          .optional(),
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
    ChecklistModule,
    IndicatorsModule,
    CatalogModule,
    CompaniesModule,
    DocumentsModule,
    TemplatesModule,
    AssignmentsModule,
  ],
})
export class AppModule {}
