import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IndicatorsGateway } from './indicators.gateway';
@Module({ imports: [AuthModule, DatabaseModule], providers: [IndicatorsGateway], exports: [IndicatorsGateway] })
export class IndicatorsModule {}
