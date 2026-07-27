import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { user_role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { IndicatorsGateway } from '../indicators/indicators.gateway';
import {
  PermissionsService,
  type RequestActor,
} from '../permissions/permissions.service';

type UpdateAssignmentInput = {
  assigneeId: string;
  isActive: boolean;
};

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicators: IndicatorsGateway,
    private readonly permissions: PermissionsService,
  ) {}

  async ensureMonth(month: string) {
    const monthNumber = Number(month.slice(5));
    const activities = await this.prisma.client_activities.findMany({
      where: {
        is_active: true,
        scheduled_months: { has: monthNumber },
        clients: { is_active: true },
      },
      select: {
        client_id: true,
        template_id: true,
        clients: { select: { member_id: true } },
      },
    });
    if (!activities.length) return;
    await this.prisma.checklist_assignments.createMany({
      data: activities.map((activity) => ({
        month,
        client_id: activity.client_id,
        template_id: activity.template_id,
        assignee_id: activity.clients.member_id,
      })),
      skipDuplicates: true,
    });
  }

  async list(actor: RequestActor, month: string) {
    await this.ensureMonth(month);
    const memberIds = await this.permissions.visibleMemberIds(actor);
    return this.prisma.checklist_assignments.findMany({
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
        assignee_id: true,
        is_active: true,
        updated_at: true,
      },
    });
  }

  async update(
    actor: RequestActor,
    month: string,
    clientId: string,
    templateId: string,
    input: UpdateAssignmentInput,
  ) {
    if (actor.role === user_role.MEMBER) {
      throw new ForbiddenException(
        'Solo lideres y administradores asignan tareas',
      );
    }
    await this.permissions.canAccessClient(actor, clientId);
    await this.assertAssigneeVisible(actor, input.assigneeId);
    const activity = await this.prisma.client_activities.findUnique({
      where: {
        client_id_template_id: { client_id: clientId, template_id: templateId },
      },
      select: { is_active: true, scheduled_months: true },
    });
    if (
      !activity?.is_active ||
      !activity.scheduled_months.includes(Number(month.slice(5)))
    ) {
      throw new BadRequestException(
        'La actividad no esta programada para este mes',
      );
    }
    await this.ensureMonth(month);
    const assignment = await this.prisma.checklist_assignments.update({
      where: {
        month_client_id_template_id: {
          month,
          client_id: clientId,
          template_id: templateId,
        },
      },
      data: {
        assignee_id: input.assigneeId,
        assigned_by: actor.id,
        is_active: input.isActive,
        updated_at: new Date(),
      },
      select: {
        id: true,
        month: true,
        client_id: true,
        template_id: true,
        assignee_id: true,
        is_active: true,
        updated_at: true,
      },
    });
    this.indicators.emitUpdated(clientId, month);
    return assignment;
  }

  async assertCanComplete(
    actor: RequestActor,
    month: string,
    clientId: string,
    templateId: string,
  ) {
    await this.ensureMonth(month);
    const assignment = await this.prisma.checklist_assignments.findUnique({
      where: {
        month_client_id_template_id: {
          month,
          client_id: clientId,
          template_id: templateId,
        },
      },
      select: { assignee_id: true, is_active: true },
    });
    if (!assignment?.is_active) {
      throw new ForbiddenException('La asignacion de esta tarea esta inactiva');
    }
    if (actor.role !== user_role.ADMIN && assignment.assignee_id !== actor.id) {
      throw new ForbiddenException('La tarea esta asignada a otra persona');
    }
  }

  private async assertAssigneeVisible(actor: RequestActor, assigneeId: string) {
    const memberIds = await this.permissions.visibleMemberIds(actor);
    if (memberIds !== null && !memberIds.includes(assigneeId)) {
      throw new ForbiddenException('Sin permisos para asignar a esa persona');
    }
    const profile = await this.prisma.profiles.findUnique({
      where: { id: assigneeId },
      select: { role: true, is_active: true },
    });
    if (!profile || !profile.is_active || profile.role !== user_role.MEMBER) {
      throw new BadRequestException('Responsable no disponible');
    }
  }
}
