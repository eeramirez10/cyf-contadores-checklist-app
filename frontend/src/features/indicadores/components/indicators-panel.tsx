"use client";

import { Gauge } from "@/components/shared/gauge";
import type { EmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { formatRoleLabel } from "@/lib/formatters";

type IndicatorsPanelProps = {
  state: EmpresasDashboardState;
};

export function IndicatorsPanel({ state }: IndicatorsPanelProps) {
  return (
    <section className="surface rounded-3xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="display-title text-xl font-semibold">Indicadores de avance</h2>
        <p className="text-xs text-[var(--foreground-soft)]">
          {formatRoleLabel(state.currentUser?.role ?? "")} - {state.currentUser?.name}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Gauge
          label="General visible"
          value={state.globalVisibleProgress}
          subtitle={`${state.clientsVisibleToCurrent.length} empresas`}
        />
        <Gauge label="Ventas (visible)" value={state.globalVisibleVentas} />
        <Gauge label="Produccion (visible)" value={state.globalVisibleProduccion} />
        <Gauge
          label="Empresa seleccionada"
          value={state.selectedClientProgress}
          subtitle={state.selectedClient?.name ?? "Sin empresas visibles"}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Gauge
          label={state.currentUser?.role === "ADMIN" ? "Lider de grupo seleccionado" : "Tu grupo"}
          value={state.selectedLeaderProgress}
          subtitle={
            state.selectedLeaderValue
              ? state.usersById.get(state.selectedLeaderValue)?.name ?? "Sin lider de grupo"
              : state.currentUser?.role === "ADMIN"
                ? "Selecciona lider de grupo"
                : state.currentUser?.name ?? ""
          }
        />
        <Gauge
          label={state.currentUser?.role === "MEMBER" ? "Tu avance" : "Contador seleccionado"}
          value={state.selectedMemberProgress}
          subtitle={
            state.selectedMemberValue
              ? state.usersById.get(state.selectedMemberValue)?.name ?? "Sin contador"
              : state.currentUser?.role === "MEMBER"
                ? state.currentUser?.name ?? ""
                : "Selecciona contador"
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="status-pill rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[10px] text-[var(--foreground-soft)]">
          Historial: {state.availableMonths.length} meses
        </span>
        {state.availableMonths.slice(0, 6).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => state.setMonth(item)}
            className={`status-pill rounded-full border px-2 py-1 text-[10px] ${
              state.month === item
                ? "border-[var(--line-strong)] bg-white text-[var(--foreground)]"
                : "border-[var(--line)] text-[var(--foreground-soft)]"
            }`}
          >
            {item}
          </button>
        ))}
        <span className="status-pill rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[10px] text-[var(--foreground-soft)]">
          {state.canUncheck
            ? "Administrador puede desmarcar checks"
            : "Solo Administrador puede desmarcar"}
        </span>
        {state.dataLoading ? (
          <span className="status-pill rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[10px] text-[var(--foreground-soft)]">
            Sincronizando...
          </span>
        ) : null}
      </div>
    </section>
  );
}
