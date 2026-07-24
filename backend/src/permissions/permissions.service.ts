import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { user_role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type RequestActor = {
  id: string;
  role: string;
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async visibleMemberIds(actor: RequestActor): Promise<string[] | null> {
    if (actor.role === user_role.ADMIN) {
      return null;
    }

    if (actor.role === user_role.MEMBER) {
      return [actor.id];
    }

    const leader = await this.prisma.profiles.findUnique({
      where: { id: actor.id },
      select: { group_id: true },
    });
    if (!leader) {
      throw new ForbiddenException('Perfil no encontrado');
    }

    const members = await this.prisma.profiles.findMany({
      where: {
        role: user_role.MEMBER,
        OR: [
          { leader_id: actor.id },
          ...(leader.group_id ? [{ group_id: leader.group_id }] : []),
        ],
      },
      select: { id: true },
    });
    return members.map((member) => member.id);
  }

  async canManageMember(actor: RequestActor, memberId: string): Promise<void> {
    const memberIds = await this.visibleMemberIds(actor);
    if (memberIds !== null && !memberIds.includes(memberId)) {
      throw new ForbiddenException('Sin permisos para asignar ese contador');
    }

    const member = await this.prisma.profiles.findUnique({
      where: { id: memberId },
      select: { role: true, is_active: true },
    });
    if (!member || !member.is_active || member.role !== user_role.MEMBER) {
      throw new NotFoundException('Contador no encontrado');
    }
  }

  async canAccessClient(actor: RequestActor, clientId: string): Promise<void> {
    const client = await this.prisma.clients.findUnique({
      where: { id: clientId },
      select: { member_id: true },
    });
    if (!client) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const memberIds = await this.visibleMemberIds(actor);
    if (memberIds !== null && !memberIds.includes(client.member_id)) {
      throw new ForbiddenException('Sin permisos para esta empresa');
    }
  }
}
