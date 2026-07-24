import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import type { Request } from 'express';
import { UsersService } from './users.service';

class UserAssignmentDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string;
}

class CreateUserDto extends UserAssignmentDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['ADMIN', 'LEADER', 'MEMBER'])
  role: 'ADMIN' | 'LEADER' | 'MEMBER';
}

class UpdateUserDto extends UserAssignmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'LEADER', 'MEMBER'])
  role?: 'ADMIN' | 'LEADER' | 'MEMBER';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name: string;
}

type UserRequest = Request & { user: { role: string } };

@Controller({ path: 'admin/users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() request: UserRequest) {
    return this.users.listAdminCatalog(request.user.role);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() request: UserRequest) {
    return this.users.createAdminUser(request.user.role, dto);
  }

  @Patch(':userId')
  update(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() request: UserRequest,
  ) {
    return this.users.updateAdminUser(request.user.role, userId, dto);
  }
}

@Controller({ path: 'admin/groups', version: '1' })
export class GroupsController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateGroupDto, @Req() request: UserRequest) {
    return this.users.createGroup(request.user.role, dto.name);
  }
}
