export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const formatDateMx = (value: string | null): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(date);
};

export const formatRoleLabel = (role: string): string => {
  if (role === "ADMIN") {
    return "Administrador";
  }
  if (role === "LEADER") {
    return "Lider de grupo";
  }
  if (role === "MEMBER") {
    return "Contador";
  }
  return role;
};
