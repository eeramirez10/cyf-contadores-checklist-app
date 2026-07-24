import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import type { Request } from 'express';
import { ChecklistService } from './checklist.service';
class UpdateChecklistDto { @IsBoolean() completed: boolean; }
type UserRequest = Request & { user: { id: string; role: string } };
@Controller({ path: 'checklist', version: '1' })
export class ChecklistController {
  constructor(private readonly checklist: ChecklistService) {}
  @Get()
  list(@Query('month') month: string, @Req() request: UserRequest) { return this.checklist.list(month, request.user.id, request.user.role); }
  @Put(':clientId/:templateId')
  update(@Param('clientId') clientId: string, @Param('templateId') templateId: string, @Query('month') month: string, @Body() dto: UpdateChecklistDto, @Req() request: UserRequest) { return this.checklist.update(month, clientId, templateId, dto.completed, request.user.id, request.user.role); }
}
