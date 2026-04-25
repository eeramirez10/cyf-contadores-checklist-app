"use client";

import Image from "next/image";
import Link from "next/link";
import type { PanelSection } from "@/hooks/use-panel-navigation";

type SidebarItem = {
  href: string;
  label: string;
  description: string;
  section: PanelSection;
};

type AppSidebarProps = {
  items: SidebarItem[];
  activeSection: PanelSection;
  expandedOnDesktop: boolean;
  isMobileOpen: boolean;
  setIsHovered: (value: boolean) => void;
  onNavigate?: () => void;
};

const iconWrapClass =
  "menu-item-icon-size flex h-8 w-8 items-center justify-center rounded-lg border transition";

const sectionIcon = (section: PanelSection) => {
  if (section === "dashboard") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 10.5L12 3L21 10.5V21H3V10.5Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (section === "indicadores") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 20H20" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 16V10" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 16V6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M17 16V12" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (section === "jerarquia") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6" cy="19" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="19" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8V12M12 12H6M12 12H18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (section === "empresas") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10H16M8 14H14" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (section === "usuarios") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.8 18.5C5 15.9 7 14.5 9 14.5C11 14.5 13 15.9 14.2 18.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.3 17.3C16 16.1 17.1 15.3 18.3 15.1C19.4 14.9 20.5 15.2 21.3 15.9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (section === "plantillas") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 4H18V20H6V4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 9H15M9 13H15M9 17H13" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20C5.8 16.8 8.7 15 12 15C15.3 15 18.2 16.8 20 20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
};

export function AppSidebar({
  items,
  activeSection,
  expandedOnDesktop,
  isMobileOpen,
  setIsHovered,
  onNavigate,
}: AppSidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out ${
        expandedOnDesktop || isMobileOpen ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex h-[72px] items-center border-b border-gray-200 px-5 ${
          expandedOnDesktop || isMobileOpen ? "justify-start" : "justify-center"
        }`}
      >
        {expandedOnDesktop || isMobileOpen ? (
          <div className="flex items-center gap-2">
            <Image src="/images/logo/logo-icon.svg" alt="Cyf contadores" width={32} height={32} />
            <span className="display-title text-lg font-semibold tracking-tight text-gray-900">
              Cyf contadores
            </span>
          </div>
        ) : (
          <Image src="/images/logo/logo-icon.svg" alt="Cyf contadores" width={32} height={32} />
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <p
          className={`px-2 pb-3 text-[11px] uppercase tracking-[0.12em] text-gray-400 ${
            expandedOnDesktop || isMobileOpen ? "text-left" : "text-center"
          }`}
        >
          {expandedOnDesktop || isMobileOpen ? "Menu" : "M"}
        </p>
        <nav className="grid gap-1.5">
          {items.map((item) => {
            const isActive = item.section === activeSection;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`menu-item group ${
                  isActive ? "menu-item-active" : "menu-item-inactive"
                } ${expandedOnDesktop || isMobileOpen ? "justify-start" : "justify-center"}`}
              >
                <span
                  className={`${iconWrapClass} ${
                    isActive
                      ? "border-brand-200 bg-brand-100 text-brand-600"
                      : "border-gray-200 bg-gray-100 text-gray-500"
                  }`}
                >
                  {sectionIcon(item.section)}
                </span>
                {expandedOnDesktop || isMobileOpen ? (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-gray-500">{item.description}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* {expandedOnDesktop || isMobileOpen ? (
        <div className="border-t border-gray-200 p-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-800">Tip</p>
            <p className="mt-1 text-xs text-gray-500">
              Usa el buscador de empresa para saltar directo a su checklist.
            </p>
          </div>
        </div>
      ) : null} */}
    </aside>
  );
}
