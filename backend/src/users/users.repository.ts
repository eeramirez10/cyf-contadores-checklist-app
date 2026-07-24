import type { profiles } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type UserProfileRecord = Pick<
  profiles,
  'id' | 'name' | 'role' | 'group_id' | 'leader_id' | 'created_at'
>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfileById(id: string): Promise<UserProfileRecord | null> {
    return this.prisma.profiles.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        group_id: true,
        leader_id: true,
        created_at: true,
      },
    });
  }
}
