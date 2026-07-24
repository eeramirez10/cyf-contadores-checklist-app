import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';
import { CompaniesService } from './companies.service';

class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsUUID()
  memberId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  templateIds: string[];
}

type UserRequest = Request & { user: { id: string; role: string } };

@Controller({ path: 'companies', version: '1' })
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto, @Req() request: UserRequest) {
    return this.companies.create(request.user, dto);
  }
}
