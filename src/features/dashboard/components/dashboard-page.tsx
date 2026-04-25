"use client";

import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { IndicatorsPanel } from "@/features/indicadores/components/indicators-panel";

export function DashboardPage() {
  const state = useEmpresasDashboardState();

  return (
    <EmpresasPageShell state={state}>
      <IndicatorsPanel state={state} />
    </EmpresasPageShell>
  );
}
