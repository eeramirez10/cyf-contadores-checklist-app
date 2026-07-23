"use client";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAdminSidebar } from "@/hooks/use-admin-sidebar";
import { usePanelNavigation } from "@/hooks/use-panel-navigation";

type PanelFrameProps = {
  children: React.ReactNode;
};

export function PanelFrame({ children }: PanelFrameProps) {
  const { activeItem, activeSection, sidebarItems } = usePanelNavigation();
  const {
    expandedOnDesktop,
    isMobileOpen,
    closeMobileSidebar,
    setIsHovered,
    handleToggleForViewport,
  } = useAdminSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar
        items={sidebarItems}
        activeSection={activeSection}
        expandedOnDesktop={expandedOnDesktop}
        isMobileOpen={isMobileOpen}
        setIsHovered={setIsHovered}
        onNavigate={closeMobileSidebar}
      />

      <div
        className={`min-h-screen transition-all duration-300 ${
          expandedOnDesktop ? "lg:ml-[290px]" : "lg:ml-[90px]"
        }`}
      >
        <AppHeader
          title={activeItem.label}
          description={activeItem.description}
          onToggleSidebar={handleToggleForViewport}
        />
        <div className="mx-auto max-w-[1680px] p-4 md:p-6">{children}</div>
      </div>

      {isMobileOpen ? (
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-[#10182880] lg:hidden"
          aria-label="Cerrar menu lateral"
        />
      ) : null}
    </div>
  );
}
