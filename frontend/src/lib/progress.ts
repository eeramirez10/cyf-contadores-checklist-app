import type { Area, ChecklistEntry, ClientActivity } from "@/lib/types";

const toFixedPercent = (value: number): number => Math.round(value * 10) / 10;

const entryKey = (
  month: string,
  clientId: string,
  templateId: string,
): string => `${month}|${clientId}|${templateId}`;

export const completionLabel = (percent: number): string => {
  if (percent < 60) {
    return "Critico";
  }
  if (percent < 80) {
    return "En riesgo";
  }
  return "En objetivo";
};

export const gaugeColor = (percent: number): string => {
  if (percent < 60) {
    return "var(--danger)";
  }
  if (percent < 80) {
    return "var(--warning)";
  }
  return "var(--success)";
};

type ProgressInput = {
  entries: ChecklistEntry[];
  activities: ClientActivity[];
  clientIds: string[];
  month: string;
  area?: Area;
};

export const calculateProgress = ({
  entries,
  activities,
  clientIds,
  month,
  area,
}: ProgressInput): number => {
  const clientIdSet = new Set(clientIds);
  const monthNumber = Number(month.slice(5));
  const scopedActivities = activities.filter(
    (activity) =>
      activity.isActive &&
      clientIdSet.has(activity.clientId) &&
      activity.scheduledMonths.includes(monthNumber) &&
      (!area || activity.area === area),
  );
  if (!scopedActivities.length || !clientIds.length) {
    return 0;
  }

  const scopedEntries = new Map<string, ChecklistEntry>();
  for (const entry of entries) {
    if (entry.month !== month) {
      continue;
    }
    scopedEntries.set(entryKey(month, entry.clientId, entry.templateId), entry);
  }

  const totalWeight = scopedActivities.reduce(
    (sum, activity) => sum + activity.weight,
    0,
  );
  if (totalWeight <= 0) {
    return 0;
  }

  let completedWeight = 0;
  for (const activity of scopedActivities) {
    const key = entryKey(month, activity.clientId, activity.templateId);
    if (scopedEntries.get(key)?.completed) {
      completedWeight += activity.weight;
    }
  }

  return toFixedPercent((completedWeight / totalWeight) * 100);
};
