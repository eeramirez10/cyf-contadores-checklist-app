import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';
import { TemplatesService } from './templates.service';

class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  areaId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  defaultWeight: number;
}

class CreateAreaDto {
  @IsString()
  @MinLength(1)
  name: string;
}

class UpdateTemplateDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  defaultWeight?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

type UserRequest = Request & { user: { id: string; role: string } };

@Controller({ path: 'templates', version: '1' })
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() request: UserRequest) {
    return this.templates.create(request.user.role, request.user.id, dto);
  }

  @Post('areas')
  createArea(@Body() dto: CreateAreaDto, @Req() request: UserRequest) {
    return this.templates.createArea(request.user.role, dto.name);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() request: UserRequest,
  ) {
    return this.templates.update(request.user.role, id, dto);
  }
}
