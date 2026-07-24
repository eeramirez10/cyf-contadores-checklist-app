import { Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { type UserProfileRecord, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  findProfileById(id: string): Promise<UserProfileRecord | null> {
    return this.usersRepository.findProfileById(id);
  }

  async listAdminCatalog(requesterRole: string) {
    if (requesterRole !== 'ADMIN') throw new ForbiddenException();
    const [users, groups] = await Promise.all([
      this.prisma.profiles.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          group_id: true,
          leader_id: true,
          is_active: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.groups.findMany({
        select: { id: true, name: true, leader_id: true, created_at: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { users, groups };
  }

  async createAdminUser(
    requesterRole: string,
    data: {
      name: string;
      email: string;
      password: string;
      role: 'ADMIN' | 'LEADER' | 'MEMBER';
    },
  ) {
    if (requesterRole !== 'ADMIN') throw new ForbiddenException();
    return this.prisma.profiles.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        password_hash: await argon2.hash(data.password),
        is_active: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
