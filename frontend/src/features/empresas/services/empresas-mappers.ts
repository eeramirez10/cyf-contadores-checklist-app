import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import type {
  ActivityTemplate,
  ChecklistEntry,
  Client,
  ClientActivity,
  Group,
  User,
} from "@/lib/types";
import type {
  DbChecklistRow,
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
  displayOrder: row.display_order,
  isActive: row.is_active,
  createdBy: row.created_by,
});

export const normalizeClient = (row: DbClientRow): Client => ({
  id: row.id,
  name: row.name,
  memberId: row.member_id,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const normalizeClientActivity = (row: DbClientActivityRow): ClientActivity => ({
  id: row.id,
  clientId: row.client_id,
  templateId: row.template_id,
  name: row.name,
  area: row.area,
  weight: Number(row.weight),
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
});

export const convertRealtimeChecklist = (value: Record<string, unknown>): ChecklistEntry => {
  return normalizeChecklist({
    id: String(value.id),
    month: String(value.month),
    client_id: String(value.client_id),
    template_id: String(value.template_id),
    completed: Boolean(value.completed),
    completed_at: value.completed_at ? String(value.completed_at) : null,
    updated_at: String(value.updated_at ?? new Date().toISOString()),
    completed_by: value.completed_by ? String(value.completed_by) : null,
  });
};

export const subscribeChecklistRealtime = (
  supabase: SupabaseClient,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) => {
  const channel = supabase
    .channel("checklist-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "checklist_entries" }, onChange)
    .subscribe();
  return channel;
};
