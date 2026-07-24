import { Module } from '@nestjs/common';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { IndicatorsModule } from '../indicators/indicators.module';
@Module({ imports: [IndicatorsModule], controllers: [ChecklistController], providers: [ChecklistService] })
export class ChecklistModule {}
