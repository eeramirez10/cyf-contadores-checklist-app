import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { IsBoolean, IsUUID, Matches } from 'class-validator';
import type { Request } from 'express';
import { ChecklistService } from './checklist.service';
class MonthQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;
}

class UpdateChecklistDto {
  @IsBoolean()
  completed: boolean;
}

class UpdateAssignmentDto {
  @IsUUID()
  assigneeId: string;

  @IsBoolean()
  isActive: boolean;
}

type UserRequest = Request & { user: { id: string; role: string } };
@Controller({ path: 'checklist', version: '1' })
export class ChecklistController {
  constructor(private readonly checklist: ChecklistService) {}

  @Get()
  list(@Query() query: MonthQueryDto, @Req() request: UserRequest) {
    return this.checklist.list(query.month, request.user.id, request.user.role);
  }

  @Put(':clientId/:templateId')
  update(
    @Param('clientId') clientId: string,
    @Param('templateId') templateId: string,
    @Query() query: MonthQueryDto,
    @Body() dto: UpdateChecklistDto,
    @Req() request: UserRequest,
  ) {
    return this.checklist.update(
      query.month,
      clientId,
      templateId,
      dto.completed,
      request.user.id,
      request.user.role,
    );
  }

  @Put(':clientId/:templateId/assignment')
  updateAssignment(
    @Param('clientId') clientId: string,
    @Param('templateId') templateId: string,
    @Query() query: MonthQueryDto,
    @Body() dto: UpdateAssignmentDto,
    @Req() request: UserRequest,
  ) {
    return this.checklist.updateAssignment(
      query.month,
      clientId,
      templateId,
      dto.assigneeId,
      dto.isActive,
      request.user,
    );
  }
}
