import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [PermissionsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
