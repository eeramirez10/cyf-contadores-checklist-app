import { Injectable } from '@nestjs/common';
import { type UserProfileRecord, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findProfileById(id: string): Promise<UserProfileRecord | null> {
    return this.usersRepository.findProfileById(id);
  }
}
