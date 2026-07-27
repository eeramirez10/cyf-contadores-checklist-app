import type {
  ActivityTemplate,
  Area,
  ChecklistEntry,
  Client,
  ClientActivity,
  Group,
  User,
} from "@/lib/types";

const hashNumber = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const monthShift = (month: string, shift: number): string => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const base = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  base.setUTCMonth(base.getUTCMonth() + shift);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
};

const buildStableIsoForSeed = (month: string, seed: number): string => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const safeYear = Number.isFinite(year) ? year : 2026;
  const safeMonth =
    Number.isFinite(monthIndex) && monthIndex >= 0 && monthIndex <= 11 ? monthIndex : 0;
  const day = 1 + (seed % 28);
  const hour = (seed * 3) % 24;
  const minute = (seed * 7) % 60;
  return new Date(Date.UTC(safeYear, safeMonth, day, hour, minute, 0)).toISOString();
};

const completionThresholdByArea: Record<Area, number> = {
  VENTAS: 62,
  PRODUCCION: 57,
};
const ALL_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export const currentMonthKey = (): string => new Date().toISOString().slice(0, 7);

export const sampleGroups: Group[] = [
  { id: "grp-luis", name: "Grupo Luis", leaderId: "usr-leader-luis" },
  { id: "grp-bryan", name: "Grupo Bryan", leaderId: "usr-leader-bryan" },
];

export const sampleUsers: User[] = [
  { id: "usr-admin-luis-alberto", name: "Luis Alberto Gonzalez", role: "ADMIN", groupId: null, leaderId: null },
  { id: "usr-leader-luis", name: "Luis (Lider)", role: "LEADER", groupId: "grp-luis", leaderId: null },
  { id: "usr-leader-bryan", name: "Bryan (Lider)", role: "LEADER", groupId: "grp-bryan", leaderId: null },
  { id: "usr-member-erick", name: "Erick", role: "MEMBER", groupId: "grp-luis", leaderId: "usr-leader-luis" },
  { id: "usr-member-monse", name: "Monse", role: "MEMBER", groupId: "grp-luis", leaderId: "usr-leader-luis" },
  { id: "usr-member-jonathan", name: "Jonathan", role: "MEMBER", groupId: "grp-bryan", leaderId: "usr-leader-bryan" },
  { id: "usr-member-miguel", name: "Miguel", role: "MEMBER", groupId: "grp-bryan", leaderId: "usr-leader-bryan" },
];

export const sampleTemplates: ActivityTemplate[] = [
  { id: "tpl-estado-cuenta", name: "Estado de cuenta", area: "VENTAS", defaultWeight: 10, scheduledMonths: ALL_MONTHS, displayOrder: 1, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-contabilidad", name: "Contabilidad", area: "VENTAS", defaultWeight: 10, scheduledMonths: ALL_MONTHS, displayOrder: 2, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-pendientes", name: "Pendientes", area: "VENTAS", defaultWeight: 8, scheduledMonths: ALL_MONTHS, displayOrder: 3, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-conciliacion", name: "Conciliacion bancaria", area: "VENTAS", defaultWeight: 12, scheduledMonths: ALL_MONTHS, displayOrder: 4, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-estados-financieros", name: "Revision estados financieros", area: "PRODUCCION", defaultWeight: 14, scheduledMonths: ALL_MONTHS, displayOrder: 5, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-deudores", name: "Revision deudores", area: "PRODUCCION", defaultWeight: 10, scheduledMonths: ALL_MONTHS, displayOrder: 6, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-acreedores", name: "Revision acreedores", area: "PRODUCCION", defaultWeight: 8, scheduledMonths: ALL_MONTHS, displayOrder: 7, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-cancelacion-impuestos", name: "Cancelacion impuestos", area: "PRODUCCION", defaultWeight: 10, scheduledMonths: ALL_MONTHS, displayOrder: 8, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-determinacion-impuestos", name: "Determinacion impuestos", area: "PRODUCCION", defaultWeight: 10, scheduledMonths: ALL_MONTHS, displayOrder: 9, isActive: true, createdBy: "usr-admin-luis-alberto" },
  { id: "tpl-cumplimiento", name: "Cumplimiento obligaciones", area: "PRODUCCION", defaultWeight: 8, scheduledMonths: ALL_MONTHS, displayOrder: 10, isActive: true, createdBy: "usr-admin-luis-alberto" },
];

export const sampleClients: Client[] = [
  { id: "cli-sindu", name: "Sindu SA de CV", memberId: "usr-member-erick", isActive: true, createdAt: "2026-01-06T10:00:00.000Z" },
  { id: "cli-falsa", name: "Falsa Industrial", memberId: "usr-member-erick", isActive: true, createdAt: "2026-01-10T10:00:00.000Z" },
  { id: "cli-sistemas-rio", name: "Sistemas del Rio", memberId: "usr-member-monse", isActive: true, createdAt: "2026-01-12T10:00:00.000Z" },
  { id: "cli-comercial-trigo", name: "Comercial Trigo", memberId: "usr-member-monse", isActive: true, createdAt: "2026-01-15T10:00:00.000Z" },
  { id: "cli-orbita", name: "Orbita Logistica", memberId: "usr-member-jonathan", isActive: true, createdAt: "2026-01-07T10:00:00.000Z" },
  { id: "cli-loma", name: "Loma Consultores", memberId: "usr-member-jonathan", isActive: true, createdAt: "2026-01-11T10:00:00.000Z" },
  { id: "cli-vivero", name: "Vivero del Norte", memberId: "usr-member-miguel", isActive: true, createdAt: "2026-01-08T10:00:00.000Z" },
  { id: "cli-cafe-puerto", name: "Cafe Puerto", memberId: "usr-member-miguel", isActive: true, createdAt: "2026-01-14T10:00:00.000Z" },
];

const clientPackMap: Record<string, string[]> = {
  "cli-sindu": ["tpl-estado-cuenta", "tpl-contabilidad", "tpl-conciliacion", "tpl-estados-financieros", "tpl-cancelacion-impuestos", "tpl-cumplimiento"],
  "cli-falsa": ["tpl-estado-cuenta", "tpl-pendientes", "tpl-conciliacion", "tpl-estados-financieros", "tpl-deudores", "tpl-cumplimiento"],
  "cli-sistemas-rio": ["tpl-estado-cuenta", "tpl-contabilidad", "tpl-pendientes", "tpl-conciliacion", "tpl-estados-financieros", "tpl-acreedores", "tpl-determinacion-impuestos"],
  "cli-comercial-trigo": ["tpl-estado-cuenta", "tpl-contabilidad", "tpl-conciliacion", "tpl-deudores", "tpl-cancelacion-impuestos", "tpl-cumplimiento"],
  "cli-orbita": ["tpl-estado-cuenta", "tpl-pendientes", "tpl-conciliacion", "tpl-estados-financieros", "tpl-acreedores", "tpl-determinacion-impuestos"],
  "cli-loma": ["tpl-contabilidad", "tpl-pendientes", "tpl-conciliacion", "tpl-estados-financieros", "tpl-cancelacion-impuestos", "tpl-cumplimiento"],
  "cli-vivero": ["tpl-estado-cuenta", "tpl-contabilidad", "tpl-conciliacion", "tpl-estados-financieros", "tpl-deudores", "tpl-acreedores", "tpl-cumplimiento"],
  "cli-cafe-puerto": ["tpl-estado-cuenta", "tpl-contabilidad", "tpl-pendientes", "tpl-conciliacion", "tpl-estados-financieros", "tpl-cancelacion-impuestos", "tpl-determinacion-impuestos"],
};

export const sampleClientActivities: ClientActivity[] = sampleClients.flatMap((client) => {
  const templateIds = clientPackMap[client.id] ?? [];
  return templateIds.map((templateId, index) => {
    const template = sampleTemplates.find((item) => item.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} no encontrado`);
    }
    return {
      id: `cat-${client.id}-${template.id}`,
      clientId: client.id,
      templateId: template.id,
      name: template.name,
      area: template.area,
      weight: template.defaultWeight,
      scheduledMonths: template.scheduledMonths,
      displayOrder: index + 1,
      isActive: true,
    };
  });
});

const buildEntriesForMonth = (month: string): ChecklistEntry[] => {
  return sampleClientActivities.map((activity) => {
    const seed = hashNumber(`${month}-${activity.clientId}-${activity.templateId}`);
    const threshold = completionThresholdByArea[activity.area];
    const completed = seed % 100 < threshold;
    const stableTimestamp = buildStableIsoForSeed(month, seed);
    return {
      id: `${month}-${activity.clientId}-${activity.templateId}`,
      month,
      clientId: activity.clientId,
      templateId: activity.templateId,
      completed,
      completedAt: completed ? stableTimestamp : null,
      updatedAt: stableTimestamp,
      completedBy: completed ? sampleClients.find((client) => client.id === activity.clientId)?.memberId ?? null : null,
      activityName: activity.name,
      areaSnapshot: activity.area,
      weightSnapshot: activity.weight,
    };
  });
};

export const buildMockEntries = (month: string): ChecklistEntry[] => {
  const historyMonths = [monthShift(month, -2), monthShift(month, -1), month];
  return historyMonths.flatMap((monthKey) => buildEntriesForMonth(monthKey));
};
