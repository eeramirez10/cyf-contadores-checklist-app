import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { user_role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { type UserProfileRecord, UsersRepository } from './users.repository';

type ManagedRole = 'ADMIN' | 'LEADER' | 'MEMBER';
type UserInput = {
  name: string;
  role: ManagedRole;
  groupId?: string | null;
  leaderId?: string | null;
};

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
    data: UserInput & { email: string; password: string },
  ) {
    if (requesterRole !== 'ADMIN') throw new ForbiddenException();
    const assignment = await this.resolveAssignment(data);
    const user = await this.prisma.profiles.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase(),
        role: data.role,
        group_id: assignment.groupId,
        leader_id: assignment.leaderId,
        password_hash: await argon2.hash(data.password),
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        group_id: true,
        leader_id: true,
        is_active: true,
      },
    });
    if (data.role === 'LEADER' && assignment.groupId) {
      await this.prisma.groups.update({
        where: { id: assignment.groupId },
        data: { leader_id: user.id },
      });
    }
    return user;
  }

  async updateAdminUser(
    requesterRole: string,
    userId: string,
    data: Partial<UserInput> & { isActive?: boolean },
  ) {
    if (requesterRole !== 'ADMIN') throw new ForbiddenException();
    const current = await this.prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        group_id: true,
        leader_id: true,
      },
    });
    if (!current) throw new NotFoundException('Perfil no encontrado');
    const role = data.role ?? current.role;
    const assignment = await this.resolveAssignment(
      {
        name: data.name ?? current.name,
        role,
        groupId: data.groupId === undefined ? current.group_id : data.groupId,
        leaderId:
          data.leaderId === undefined ? current.leader_id : data.leaderId,
      },
      userId,
    );
    const user = await this.prisma.profiles.update({
      where: { id: userId },
      data: {
        ...(data.name === undefined ? {} : { name: data.name.trim() }),
        role,
        group_id: assignment.groupId,
        leader_id: assignment.leaderId,
        ...(data.isActive === undefined ? {} : { is_active: data.isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        group_id: true,
        leader_id: true,
        is_active: true,
      },
    });
    if (role === 'LEADER' && assignment.groupId) {
      await this.prisma.groups.update({
        where: { id: assignment.groupId },
        data: { leader_id: user.id },
      });
    }
    return user;
  }

  async createGroup(requesterRole: string, name: string) {
    if (requesterRole !== 'ADMIN') throw new ForbiddenException();
    const normalizedName = name.trim();
    if (!normalizedName)
      throw new BadRequestException('Nombre de grupo requerido');
    return this.prisma.groups.create({
      data: { name: normalizedName },
      select: { id: true, name: true, leader_id: true, created_at: true },
    });
  }

  private async resolveAssignment(input: UserInput, userId?: string) {
    if (input.role === 'ADMIN') return { groupId: null, leaderId: null };
    let groupId = input.groupId?.trim() || null;
    const leaderId =
      input.role === 'LEADER' ? null : input.leaderId?.trim() || null;
    if (groupId) {
      const group = await this.prisma.groups.findUnique({
        where: { id: groupId },
        select: { id: true },
      });
      if (!group) throw new BadRequestException('Grupo no encontrado');
    }
    if (leaderId) {
      if (leaderId === userId) {
        throw new BadRequestException(
          'Un usuario no puede ser su propio lider',
        );
      }
      const leader = await this.prisma.profiles.findUnique({
        where: { id: leaderId },
        select: { id: true, role: true, group_id: true, is_active: true },
      });
      if (!leader || !leader.is_active || leader.role !== user_role.LEADER) {
        throw new BadRequestException(
          'El lider asignado debe tener rol LEADER',
        );
      }
      if (groupId && leader.group_id && leader.group_id !== groupId) {
        throw new BadRequestException(
          'El lider no pertenece al grupo seleccionado',
        );
      }
      groupId ??= leader.group_id;
    }
    return { groupId, leaderId };
  }
}
