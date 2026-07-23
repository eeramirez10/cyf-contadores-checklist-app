import type { UserRole } from "@/lib/types";

export const isAdminRole = (role: UserRole | null | undefined): boolean => role === "ADMIN";
export const isLeaderRole = (role: UserRole | null | undefined): boolean => role === "LEADER";
export const isMemberRole = (role: UserRole | null | undefined): boolean => role === "MEMBER";
