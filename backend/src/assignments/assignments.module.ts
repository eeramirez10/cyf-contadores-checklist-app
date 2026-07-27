import { Module } from '@nestjs/common';
import { IndicatorsModule } from '../indicators/indicators.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [IndicatorsModule, PermissionsModule],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
