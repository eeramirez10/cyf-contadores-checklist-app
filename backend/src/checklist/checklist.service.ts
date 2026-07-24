import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IndicatorsGateway } from '../indicators/indicators.gateway';
import {
  PermissionsService,
  type RequestActor,
} from '../permissions/permissions.service';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicators: IndicatorsGateway,
    private readonly permissions: PermissionsService,
  ) {}

  async list(month: string, profileId: string, role: string) {
    const memberIds = await this.permissions.visibleMemberIds({
      id: profileId,
      role,
    });
    return this.prisma.checklist_entries.findMany({
      where: {
        month,
        clients:
          memberIds === null ? undefined : { member_id: { in: memberIds } },
      },
      select: {
        id: true,
        month: true,
        client_id: true,
        template_id: true,
        completed: true,
        completed_at: true,
        completed_by: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  async update(
    month: string,
    clientId: string,
    templateId: string,
    completed: boolean,
    profileId: string,
    role: string,
  ) {
    const actor: RequestActor = { id: profileId, role };
    await this.permissions.canAccessClient(actor, clientId);
    const existing = await this.prisma.checklist_entries.findUnique({
      where: {
        month_client_id_template_id: {
          month,
          client_id: clientId,
          template_id: templateId,
        },
      },
      select: { completed: true },
    });
    if (existing?.completed && !completed && role !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo Administrador puede quitar checks ya marcados',
      );
    }
    const entry = await this.prisma.checklist_entries.upsert({
      where: {
        month_client_id_template_id: {
          month,
          client_id: clientId,
          template_id: templateId,
        },
      },
      create: {
        month,
        client_id: clientId,
        template_id: templateId,
        completed,
        completed_at: completed ? new Date() : null,
        completed_by: completed ? profileId : null,
      },
      update: {
        completed,
        completed_at: completed ? new Date() : null,
        completed_by: completed ? profileId : null,
      },
    });
    this.indicators.emitUpdated(clientId, month);
    return entry;
  }
}
