"use client";

import { EmpresaChecklistContent } from "@/features/empresas/components/empresa-checklist-content";
import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { formatCompletedAt, progressBadgeClass } from "@/features/empresas/utils/empresas-helpers";

export function EmpresasPage() {
  const state = useEmpresasDashboardState();

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4 xl:grid-cols-[1fr]">
        <article className="surface rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display-title text-xl font-semibold">Empresas</h2>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Tabla de empresas con avance y acceso directo al checklist.
              </p>
            </div>
            <span className="status-pill rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[10px] text-[var(--foreground-soft)]">
              {state.clientsTableRows.length} empresas visibles
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr]">
            <input
              value={state.clientsSearchQuery}
              onChange={(event) => state.setClientsSearchQuery(event.target.value)}
              className="soft-input h-10 px-3 text-sm"
              placeholder="Buscar empresa o contador..."
            />
            <select
              value={state.clientsMemberFilter}
              onChange={(event) => state.setClientsMemberFilter(event.target.value)}
              className="soft-input h-10 px-3 text-sm"
            >
              <option value="ALL">Todos los contadores</option>
              {state.membersVisibleToCurrent.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[1060px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("client")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Empresa</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("client")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("owner")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Contador</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("owner")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("group")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Grupo</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("group")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("checks")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Checks</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("checks")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("ventas")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Ventas</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("ventas")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("produccion")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Produccion</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("produccion")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("progress")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Avance</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("progress")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("lastCompletedAt")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Ultimo check</span>
                      <span className="text-[11px] text-gray-400">{state.sortMarkerForClients("lastCompletedAt")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Accion</th>
                </tr>
              </thead>
              <tbody>
                {state.visibleClientRows.length ? (
                  state.visibleClientRows.map((row) => (
                    <tr
                      key={row.client.id}
                      className={`border-t border-[var(--line)] ${
                        state.selectedClientValue === row.client.id
                          ? "bg-brand-50"
                          : "odd:bg-white even:bg-gray-50/40 hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{row.client.name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.ownerName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.groupName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.completedCount}/{row.totalCount}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.ventas.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-gray-600">{row.produccion.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${progressBadgeClass(row.progress)}`}
                        >
                          {row.progress.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--foreground-soft)]">
                        {formatCompletedAt(row.lastCompletedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => state.openChecklistModal(row.client.id)}
                          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Ver checklist
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      Sin empresas para los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[var(--foreground-soft)]">
              Pagina {state.clientsCurrentPage} de {state.clientsTotalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => state.setClientsPage(Math.max(1, state.clientsCurrentPage - 1))}
                disabled={state.clientsCurrentPage <= 1}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => state.setClientsPage(Math.min(state.clientsTotalPages, state.clientsCurrentPage + 1))}
                disabled={state.clientsCurrentPage >= state.clientsTotalPages}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </article>

     
      </section>

      {state.checklistModalClient ? (
        <div
          className="fixed inset-0 z-[80] bg-[#10182885] backdrop-blur-[2px]"
          onClick={state.closeChecklistModal}
        >
          <div
            className="mx-auto mt-[6vh] w-[min(1160px,95vw)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="status-pill text-[10px] text-[var(--foreground-soft)]">Checklist</p>
                <h3 className="display-title text-xl font-semibold">{state.checklistModalClient.name}</h3>
              </div>
              <button
                type="button"
                onClick={state.closeChecklistModal}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[78vh] overflow-auto p-5">
              <EmpresaChecklistContent
                state={state}
                client={state.checklistModalClient}
                activities={state.checklistModalClientActivities}
                progress={state.checklistModalClientProgress}
                ventas={state.checklistModalClientVentas}
                produccion={state.checklistModalClientProduccion}
              />
            </div>
          </div>
        </div>
      ) : null}
    </EmpresasPageShell>
  );
}
