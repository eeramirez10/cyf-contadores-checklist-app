import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { GroupsController, UsersController } from './users.controller';

@Module({
  controllers: [UsersController, GroupsController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
