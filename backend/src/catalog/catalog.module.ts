import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [PermissionsModule, AssignmentsModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
