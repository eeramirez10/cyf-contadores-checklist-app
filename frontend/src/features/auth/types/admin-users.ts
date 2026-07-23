import type { UserRole } from "@/lib/types";

export type ManagedUser = {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  group_id: string | null;
  leader_id: string | null;
  created_at: string;
};

export type GroupRow = {
  id: string;
  name: string;
  leader_id: string | null;
  created_at: string;
};

export type UsersApiResponse = {
  users: ManagedUser[];
  groups: GroupRow[];
  error?: string;
};
