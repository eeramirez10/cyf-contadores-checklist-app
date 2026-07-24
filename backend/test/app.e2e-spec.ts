import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/config/configure-app';
import { HealthResponse } from './../src/health/health.service';

process.env.CORS_ORIGINS ??= 'http://localhost:3001';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5432/cyf?schema=public';
process.env.DIRECT_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5432/cyf?schema=public';
process.env.JWT_ACCESS_SECRET ??=
  'test-access-secret-that-is-long-enough-for-validation';
process.env.JWT_REFRESH_SECRET ??=
  'test-refresh-secret-that-is-long-enough-for-validation';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        const health = body as HealthResponse;

        expect(health.service).toBe('cyf-backend');
        expect(health.status).toBe('ok');
        expect(Number.isInteger(health.uptimeSeconds)).toBe(true);
        expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
      });
  });

  it('allows requests from the configured frontend origin', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:3001')
      .expect('access-control-allow-origin', 'http://localhost:3001')
      .expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
