"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

export type PanelSection =
  | "dashboard"
  | "indicadores"
  | "jerarquia"
  | "empresas"
  | "documentos"
  | "cotizaciones"
  | "productos"
  | "usuarios"
  | "plantillas"
  | "usuario";

type PanelNavItem = {
  href: string;
  label: string;
  description: string;
  section: PanelSection;
  inSidebar?: boolean;
};

const NAV_ITEMS: PanelNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Resumen general y KPIs",
    section: "dashboard",
  },
  {
    href: "/indicadores",
    label: "Indicadores",
    description: "Avance por nivel",
    section: "indicadores",
  },
  {
    href: "/jerarquia",
    label: "Jerarquia",
    description: "Administrador, lideres, contadores y empresas",
    section: "jerarquia",
    // Keep the route available without exposing it in the primary navigation.
    inSidebar: false,
  },
  {
    href: "/empresas",
    label: "Empresas",
    description: "Checklist y avance por empresa",
    section: "empresas",
  },
  {
    href: "/clientes",
    label: "Empresas",
    description: "Checklist y avance por empresa",
    section: "empresas",
    inSidebar: false,
  },
  {
    href: "/documentos",
    label: "Documentos",
    description: "PDFs, contactos y envios",
    section: "documentos",
  },
  {
    href: "/cotizaciones",
    label: "Cotizaciones",
    description: "Flujo comercial",
    section: "cotizaciones",
    inSidebar: false,
  },
  {
    href: "/productos",
    label: "Productos",
    description: "Catalogo base",
    section: "productos",
    inSidebar: false,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    description: "Alta y ligado de cuentas",
    section: "usuarios",
  },
  {
    href: "/plantillas",
    label: "Plantillas",
    description: "Catalogo y alta base",
    section: "plantillas",
  },
  {
    href: "/usuario",
    label: "Usuario",
    description: "Perfil y configuracion de cuenta",
    section: "usuario",
    inSidebar: false,
  },
];

const matchSectionFromPathname = (pathname: string): PanelSection => {
  const item = [...NAV_ITEMS]
    .sort((left, right) => right.href.length - left.href.length)
    .find((entry) => pathname.startsWith(entry.href));
  return item?.section ?? "dashboard";
};

export const usePanelNavigation = () => {
  const pathname = usePathname();

  const activeSection = useMemo<PanelSection>(
    () => matchSectionFromPathname(pathname),
    [pathname],
  );

  const activeItem = useMemo(
    () =>
      NAV_ITEMS.find((item) => item.section === activeSection) ?? NAV_ITEMS[0],
    [activeSection],
  );

  return {
    items: NAV_ITEMS,
    sidebarItems: NAV_ITEMS.filter((item) => item.inSidebar !== false),
    activeSection,
    activeItem,
    pathname,
  };
};
