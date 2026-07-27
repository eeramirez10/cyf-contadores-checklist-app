import { Module } from '@nestjs/common';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { IndicatorsModule } from '../indicators/indicators.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [IndicatorsModule, PermissionsModule, AssignmentsModule],
  controllers: [ChecklistController],
  providers: [ChecklistService],
})
export class ChecklistModule {}
