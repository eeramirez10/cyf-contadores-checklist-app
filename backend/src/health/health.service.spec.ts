import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('cyf-backend'),
          },
        },
      ],
    }).compile();

    healthService = module.get<HealthService>(HealthService);
  });

  it('returns the service health data', () => {
    const health = healthService.getHealth();

    expect(health.service).toBe('cyf-backend');
    expect(health.status).toBe('ok');
    expect(Number.isInteger(health.uptimeSeconds)).toBe(true);
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });
});
