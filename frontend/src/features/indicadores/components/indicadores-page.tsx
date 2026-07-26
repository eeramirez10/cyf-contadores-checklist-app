"use client";

import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { IndicatorsPanel } from "@/features/indicadores/components/indicators-panel";
import { useIndicatorsSocket } from "@/features/indicadores/hooks/use-indicators-socket";

export function IndicadoresPage() {
  const state = useEmpresasDashboardState();
  useIndicatorsSocket(
    state.clientsVisibleToCurrent.map((client) => client.id),
    state.month,
    () => {
      void state.loadData();
    },
  );

  return (
    <EmpresasPageShell state={state}>
      <IndicatorsPanel state={state} />
    </EmpresasPageShell>
  );
}
