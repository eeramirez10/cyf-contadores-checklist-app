import type { ReactNode } from "react";
import { PanelAuthGuard } from "@/components/layout/panel-auth-guard";
import { PanelFrame } from "@/components/layout/panel-frame";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <PanelAuthGuard>
      <PanelFrame>{children}</PanelFrame>
    </PanelAuthGuard>
  );
}
