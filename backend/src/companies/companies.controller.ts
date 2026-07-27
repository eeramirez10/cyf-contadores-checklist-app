import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsEmail,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import { CompaniesService } from './companies.service';

class CompanyAddressDto {
  @IsString() @MinLength(1) street: string;
  @IsString() @MinLength(1) exteriorNumber: string;
  @IsOptional() @IsString() interiorNumber?: string;
  @IsOptional() @IsString() colony?: string;
  @Matches(/^\d{5}$/) postalCode: string;
  @IsString() @MinLength(1) city: string;
  @IsString() @MinLength(1) state: string;
  @IsOptional() @IsString() country?: string;
}

class CompanyContactDto {
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsappPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() isPrimary?: boolean;
}

class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString() @MinLength(1) legalName: string;
  @Matches(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/i) rfc: string;
  @IsString() @MinLength(1) taxRegime: string;
  @IsOptional() @IsString() ekeyReference?: string;

  @ValidateNested() @Type(() => CompanyAddressDto) address: CompanyAddressDto;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CompanyContactDto)
  contacts: CompanyContactDto[];

  @IsUUID()
  memberId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  checklistTemplateIds: string[];
}

class AnnualAgendaQueryDto {
  @Matches(/^\d{4}$/) year: string;
}

type UserRequest = Request & { user: { id: string; role: string } };

@Controller({ path: 'companies', version: '1' })
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto, @Req() request: UserRequest) {
    return this.companies.create(request.user, dto);
  }

  @Get('postal-codes/:postalCode')
  lookupPostalCode(@Param('postalCode') postalCode: string) {
    return this.companies.lookupPostalCode(postalCode);
  }

  @Get(':clientId/annual-agenda')
  annualAgenda(
    @Param('clientId') clientId: string,
    @Query() query: AnnualAgendaQueryDto,
    @Req() request: UserRequest,
  ) {
    return this.companies.annualAgenda(
      request.user,
      clientId,
      Number(query.year),
    );
  }
}
