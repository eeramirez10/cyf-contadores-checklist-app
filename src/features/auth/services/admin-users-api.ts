import type { GroupRow, ManagedUser, UsersApiResponse } from "@/features/auth/types/admin-users";
import type { UserRole } from "@/lib/types";

type ApiError = {
  error?: string;
};

export const fetchAdminCatalog = async (accessToken: string): Promise<{
  users: ManagedUser[];
  groups: GroupRow[];
}> => {
  const response = await fetch("/api/admin/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as UsersApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo cargar usuarios.");
  }

  return {
    users: payload.users ?? [],
    groups: payload.groups ?? [],
  };
};

export const createAdminUser = async (
  accessToken: string,
  payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    groupId: string | null;
    leaderId: string | null;
  },
): Promise<void> => {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(errorPayload.error ?? "No se pudo crear usuario.");
  }
};

export const updateAdminUser = async (
  accessToken: string,
  payload: {
    userId: string;
    name: string;
    role: UserRole;
    groupId: string | null;
    leaderId: string | null;
  },
): Promise<void> => {
  const response = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(errorPayload.error ?? "No se pudo actualizar usuario.");
  }
};
