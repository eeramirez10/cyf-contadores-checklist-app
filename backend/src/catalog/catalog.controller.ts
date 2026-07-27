import { Controller, Get, Query, Req } from '@nestjs/common';
import { Matches } from 'class-validator';
import type { Request } from 'express';
import { CatalogService } from './catalog.service';

type UserRequest = Request & { user: { id: string; role: string } };

class DashboardQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;
}

@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('dashboard')
  get(@Query() query: DashboardQueryDto, @Req() request: UserRequest) {
    return this.catalog.dashboard(
      request.user.id,
      request.user.role,
      query.month,
    );
  }
}
