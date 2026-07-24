import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IndicatorsGateway } from '../indicators/indicators.gateway';

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService, private readonly indicators: IndicatorsGateway) {}

  async list(month: string, profileId: string, role: string) {
    return this.prisma.checklist_entries.findMany({
      where: {
        month,
        clients: role === 'ADMIN' ? undefined : { member_id: profileId },
      },
      select: { id: true, month: true, client_id: true, template_id: true, completed: true, completed_at: true, completed_by: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    });
  }

  async update(month: string, clientId: string, templateId: string, completed: boolean, profileId: string, role: string) {
    const client = await this.prisma.clients.findUnique({ where: { id: clientId }, select: { member_id: true } });
    if (!client) throw new NotFoundException('Empresa no encontrada');
    if (role !== 'ADMIN' && client.member_id !== profileId) throw new ForbiddenException();
    const entry = await this.prisma.checklist_entries.upsert({
      where: { month_client_id_template_id: { month, client_id: clientId, template_id: templateId } },
      create: { month, client_id: clientId, template_id: templateId, completed, completed_at: completed ? new Date() : null, completed_by: completed ? profileId : null },
      update: { completed, completed_at: completed ? new Date() : null, completed_by: completed ? profileId : null },
    });
    this.indicators.emitUpdated(clientId, month);
    return entry;
  }
}
