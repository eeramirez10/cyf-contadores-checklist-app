import type {
  ActivityTemplate,
  ChecklistEntry,
  ChecklistAssignment,
  Client,
  ClientActivity,
  ChecklistTemplate,
  Group,
  User,
} from "@/lib/types";
import type {
  DbChecklistRow,
  DbChecklistAssignmentRow,
  DbChecklistTemplateRow,
  DbClientActivityRow,
  DbClientRow,
  DbGroupRow,
  DbProfileRow,
  DbTemplateRow,
} from "@/features/empresas/types/empresas-db";

export const normalizeUser = (row: DbProfileRow): User => ({
  id: row.id,
  name: row.name,
  role: row.role,
  groupId: row.group_id,
  leaderId: row.leader_id,
});

export const normalizeGroup = (row: DbGroupRow): Group => ({
  id: row.id,
  name: row.name,
  leaderId: row.leader_id ?? "",
});

export const normalizeTemplate = (row: DbTemplateRow): ActivityTemplate => ({
  id: row.id,
  name: row.name,
  area: row.area,
  defaultWeight: Number(row.default_weight),
  scheduledMonths: row.scheduled_months,
  displayOrder: row.display_order,
  isActive: row.is_active,
  createdBy: row.created_by,
});

export const normalizeChecklistTemplate = (
  row: DbChecklistTemplateRow,
): ChecklistTemplate => ({
  id: row.id,
  name: row.name,
  scheduledMonths: row.scheduled_months,
  isActive: row.is_active,
  activityIds: row.activities.map((activity) => activity.activity_template_id),
});

export const normalizeClient = (row: DbClientRow): Client => ({
  id: row.id,
  name: row.name,
  memberId: row.member_id,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const normalizeClientActivity = (
  row: DbClientActivityRow,
): ClientActivity => ({
  id: row.id,
  clientId: row.client_id,
  templateId: row.template_id,
  name: row.name,
  area: row.area,
  weight: Number(row.weight),
  scheduledMonths: row.scheduled_months,
  displayOrder: row.display_order,
  isActive: row.is_active,
});

export const normalizeChecklist = (row: DbChecklistRow): ChecklistEntry => ({
  id: row.id,
  month: row.month,
  clientId: row.client_id,
  templateId: row.template_id,
  completed: row.completed,
  completedAt: row.completed_at,
  updatedAt: row.updated_at,
  completedBy: row.completed_by,
  activityName: row.activity_name,
  areaSnapshot: row.area_snapshot,
  weightSnapshot:
    row.weight_snapshot === null ? null : Number(row.weight_snapshot),
});

export const normalizeChecklistAssignment = (
  row: DbChecklistAssignmentRow,
): ChecklistAssignment => ({
  id: row.id,
  month: row.month,
  clientId: row.client_id,
  templateId: row.template_id,
  assigneeId: row.assignee_id,
  isActive: row.is_active,
  updatedAt: row.updated_at,
});
