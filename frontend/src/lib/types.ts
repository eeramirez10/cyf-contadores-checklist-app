export type Area = string;

export type UserRole = "ADMIN" | "LEADER" | "MEMBER";

export type Group = {
  id: string;
  name: string;
  leaderId: string;
};

export type ActivityArea = {
  id: string;
  name: string;
  isActive: boolean;
};

export type User = {
  id: string;
  name: string;
  role: UserRole;
  groupId: string | null;
  leaderId: string | null;
};

export type Client = {
  id: string;
  name: string;
  memberId: string;
  isActive: boolean;
  createdAt: string;
};

export type ActivityTemplate = {
  id: string;
  name: string;
  area: Area;
  defaultWeight: number;
  displayOrder: number;
  isActive: boolean;
  createdBy: string;
};

export type ClientActivity = {
  id: string;
  clientId: string;
  templateId: string;
  name: string;
  area: Area;
  weight: number;
  displayOrder: number;
  isActive: boolean;
};

export type ChecklistEntry = {
  id: string;
  month: string;
  clientId: string;
  templateId: string;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
  completedBy: string | null;
};

export type RealtimeMode = "mock" | "live" | "connecting";
