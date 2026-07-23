export const currentMonthKey = (): string => new Date().toISOString().slice(0, 7);

export const entryKey = (month: string, clientId: string, templateId: string): string =>
  `${month}|${clientId}|${templateId}`;

export const compareMonthDesc = (left: string, right: string): number => {
  if (left > right) {
    return -1;
  }
  if (left < right) {
    return 1;
  }
  return 0;
};

export const paginateItems = <T,>(items: T[], page: number, pageSize: number): T[] => {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
};

export const progressBadgeClass = (value: number): string => {
  if (value < 60) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (value < 80) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

export const formatCompletedAt = (value: string | null): string => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(parsed);
};
