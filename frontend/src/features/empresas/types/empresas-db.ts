import type { Area } from "@/lib/types";

export type DbProfileRow = {
  id: string;
  name: string;
  role: "ADMIN" | "LEADER" | "MEMBER";
  group_id: string | null;
  leader_id: string | null;
};

export type DbGroupRow = {
  id: string;
  name: string;
  leader_id: string | null;
};

export type DbActivityAreaRow = {
  id: string;
  name: string;
  is_active: boolean;
};

export type DbTemplateRow = {
  id: string;
  name: string;
  area: Area;
  default_weight: number | string;
  scheduled_months: number[];
  display_order: number;
  is_active: boolean;
  created_by: string;
};

export type DbChecklistTemplateRow = {
  id: string;
  name: string;
  scheduled_months: number[];
  is_active: boolean;
  activities: { activity_template_id: string }[];
};

export type DbClientRow = {
  id: string;
  name: string;
  member_id: string;
  is_active: boolean;
  created_at: string;
};

export type DbClientActivityRow = {
  id: string;
  client_id: string;
  template_id: string;
  name: string;
  area: Area;
  weight: number | string;
  scheduled_months: number[];
  display_order: number;
  is_active: boolean;
};

export type DbChecklistRow = {
  id: string;
  month: string;
  client_id: string;
  template_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
  completed_by: string | null;
  activity_name: string | null;
  area_snapshot: string | null;
  weight_snapshot: number | string | null;
};
