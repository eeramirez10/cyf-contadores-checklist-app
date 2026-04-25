"use client";

import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { progressBadgeClass } from "@/features/empresas/utils/empresas-helpers";

export function JerarquiaPage() {
  const state = useEmpresasDashboardState();

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4">
        <article className="surface rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display-title text-xl font-semibold">Dashboard jerarquico</h2>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Vista escalable por tabla para gestionar muchos contadores.
              </p>
            </div>
            <span className="status-pill rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[10px] text-[var(--foreground-soft)]">
              {state.memberDirectoryRows.length} contadores visibles
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_280px]">
            <input
              value={state.memberSearchQuery}
              onChange={(event) => state.setMemberSearchQuery(event.target.value)}
              className="soft-input h-10 px-3 text-sm"
              placeholder="Buscar contador, lider de grupo o grupo..."
            />
            <select
              value={state.selectedMemberValue ?? ""}
              onChange={(event) => state.setSelectedMemberId(event.target.value || null)}
              className="soft-input h-10 px-3 text-sm"
            >
              {state.memberDirectoryRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Contador</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Lider de grupo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Grupo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Empresas</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Avance</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Accion</th>
                </tr>
              </thead>
              <tbody>
                {state.visibleMemberRows.length ? (
                  state.visibleMemberRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-[var(--line)] ${
                        state.selectedMemberValue === row.id
                          ? "bg-brand-50"
                          : "odd:bg-white even:bg-gray-50/40 hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.leaderName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.groupName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.clientsCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${progressBadgeClass(row.progress)}`}
                        >
                          {row.progress.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => state.goToMemberClients(row.id)}
                          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Ver empresas
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      Sin contadores para los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[var(--foreground-soft)]">
              Pagina {state.memberCurrentPage} de {state.memberTotalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => state.setMemberPage(Math.max(1, state.memberCurrentPage - 1))}
                disabled={state.memberCurrentPage <= 1}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => state.setMemberPage(Math.min(state.memberTotalPages, state.memberCurrentPage + 1))}
                disabled={state.memberCurrentPage >= state.memberTotalPages}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="status-pill text-[11px] text-[var(--foreground-soft)]">
                {state.currentUser?.role === "MEMBER"
                  ? "Tus empresas"
                  : `Empresas de ${state.usersById.get(state.selectedMemberValue ?? "")?.name ?? "contador"}`}
              </p>
              <input
                value={state.memberClientSearchQuery}
                onChange={(event) => state.setMemberClientSearchQuery(event.target.value)}
                className="soft-input h-9 w-full max-w-xs px-3 text-sm"
                placeholder="Buscar empresa..."
              />
            </div>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Checks</th>
                    <th className="px-3 py-2 text-left">Ventas</th>
                    <th className="px-3 py-2 text-left">Produccion</th>
                    <th className="px-3 py-2 text-left">Avance</th>
                    <th className="px-3 py-2 text-center">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {state.visibleMemberClients.length ? (
                    state.visibleMemberClients.map((client) => {
                      const stats = state.checklistStatsByClient.get(client.id);
                      const progress = state.progressByClient.get(client.id) ?? 0;
                      return (
                        <tr
                          key={client.id}
                          className={`border-t border-[var(--line)] ${
                            state.selectedClientValue === client.id
                              ? "bg-brand-50"
                              : "odd:bg-white even:bg-gray-50/40 hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-3 py-2 font-medium">{client.name}</td>
                          <td className="px-3 py-2 text-[var(--foreground-soft)]">
                            {stats?.completedCount ?? 0}/{stats?.totalCount ?? 0}
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground-soft)]">
                            {(state.progressByClientVentas.get(client.id) ?? 0).toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground-soft)]">
                            {(state.progressByClientProduccion.get(client.id) ?? 0).toFixed(1)}%
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${progressBadgeClass(progress)}`}
                            >
                              {progress.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => state.goToClientChecklist(client.id)}
                              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-sm text-[var(--foreground-soft)]"
                      >
                        Sin empresas para este nivel.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-[var(--foreground-soft)]">
                Pagina {state.memberClientCurrentPage} de {state.memberClientTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => state.setMemberClientPage(Math.max(1, state.memberClientCurrentPage - 1))}
                  disabled={state.memberClientCurrentPage <= 1}
                  className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => state.setMemberClientPage(Math.min(state.memberClientTotalPages, state.memberClientCurrentPage + 1))}
                  disabled={state.memberClientCurrentPage >= state.memberClientTotalPages}
                  className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </EmpresasPageShell>
  );
}
