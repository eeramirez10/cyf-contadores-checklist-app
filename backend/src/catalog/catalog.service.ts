import { Injectable } from '@nestjs/common';
import { user_role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async dashboard(profileId: string, role: string) {
    const actor = { id: profileId, role };
    const memberIds = await this.permissions.visibleMemberIds(actor);
    const clientWhere =
      memberIds === null ? {} : { member_id: { in: memberIds } };
    const profileWhere =
      role === user_role.ADMIN
        ? {}
        : role === user_role.LEADER
          ? { OR: [{ id: profileId }, { id: { in: memberIds ?? [] } }] }
          : { OR: [{ id: profileId }, { id: { in: [] } }] };

    const [
      profiles,
      groups,
      areas,
      templates,
      checklistTemplates,
      clients,
      activities,
      entries,
    ] = await Promise.all([
      this.prisma.profiles.findMany({
        where: profileWhere,
        select: {
          id: true,
          name: true,
          role: true,
          group_id: true,
          leader_id: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.groups.findMany({
        where: role === user_role.ADMIN ? {} : { leader_id: profileId },
        select: { id: true, name: true, leader_id: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.activity_areas.findMany({
        select: { id: true, name: true, is_active: true, created_at: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.activity_templates.findMany({
        select: {
          id: true,
          name: true,
          area: true,
          default_weight: true,
          scheduled_months: true,
          display_order: true,
          is_active: true,
          created_by: true,
        },
        orderBy: { display_order: 'asc' },
      }),
      this.prisma.checklist_templates.findMany({
        select: {
          id: true,
          name: true,
          scheduled_months: true,
          is_active: true,
          activities: {
            select: { activity_template_id: true },
            orderBy: { display_order: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.clients.findMany({
        where: { ...clientWhere, is_active: true },
        select: {
          id: true,
          name: true,
          member_id: true,
          is_active: true,
          created_at: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.client_activities.findMany({
        where: { clients: clientWhere },
        select: {
          id: true,
          client_id: true,
          template_id: true,
          name: true,
          area: true,
          weight: true,
          scheduled_months: true,
          display_order: true,
          is_active: true,
        },
        orderBy: { display_order: 'asc' },
      }),
      this.prisma.checklist_entries.findMany({
        where: { clients: clientWhere },
        select: {
          id: true,
          month: true,
          client_id: true,
          template_id: true,
          completed: true,
          completed_at: true,
          updated_at: true,
          completed_by: true,
          activity_name: true,
          area_snapshot: true,
          weight_snapshot: true,
        },
        orderBy: { updated_at: 'desc' },
      }),
    ]);
    return {
      profiles,
      groups,
      areas,
      templates,
      checklistTemplates,
      clients,
      activities,
      entries,
    };
  }
}
