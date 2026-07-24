import { Module } from '@nestjs/common';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { IndicatorsModule } from '../indicators/indicators.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [IndicatorsModule, PermissionsModule],
  controllers: [ChecklistController],
  providers: [ChecklistService],
})
export class ChecklistModule {}
