import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CatalogService } from './catalog.service';

type UserRequest = Request & { user: { id: string; role: string } };

@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('dashboard')
  get(@Req() request: UserRequest) {
    return this.catalog.dashboard(request.user.id, request.user.role);
  }
}
