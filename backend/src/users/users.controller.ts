import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsIn(['ADMIN', 'LEADER', 'MEMBER']) role: 'ADMIN' | 'LEADER' | 'MEMBER';
}
type UserRequest = Request & { user: { role: string } };

@Controller({ path: 'admin/users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list(@Req() request: UserRequest) { return this.users.listAdminCatalog(request.user.role); }
  @Post() create(@Body() dto: CreateUserDto, @Req() request: UserRequest) { return this.users.createAdminUser(request.user.role, dto); }
}
