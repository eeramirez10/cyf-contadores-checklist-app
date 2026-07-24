import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthResponse {
  service: string;
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth(): HealthResponse {
    return {
      service: this.configService.get<string>('app.apiName') ?? 'cyf-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
