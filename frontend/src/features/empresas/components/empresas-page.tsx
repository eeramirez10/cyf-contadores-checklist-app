"use client";

import { useState } from "react";
import Link from "next/link";
import { CompanyRegistrationModal } from "@/features/empresas/components/company-registration-modal";
import { CompanyEditModal } from "@/features/empresas/components/company-edit-modal";
import { EmpresaChecklistContent } from "@/features/empresas/components/empresa-checklist-content";
import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import {
  entryKey,
  formatCompletedAt,
  progressBadgeClass,
} from "@/features/empresas/utils/empresas-helpers";
import { useIndicatorsSocket } from "@/features/indicadores/hooks/use-indicators-socket";

export function EmpresasPage() {
  const state = useEmpresasDashboardState();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  useIndicatorsSocket(
    state.clientsVisibleToCurrent.map((client) => client.id),
    state.month,
    () => {
      void state.loadData();
    },
  );

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4 xl:grid-cols-[1fr]">
        <article className="surface rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display-title text-lg font-semibold">
                Trabajo activo del mes
              </h2>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Responsabilidades activas para {state.month}.
              </p>
            </div>
            <span className="status-pill rounded-full border border-[var(--line)] bg-white px-2 py-1 text-[10px] text-[var(--foreground-soft)]">
              {state.currentMonthActiveAssignments.length} tareas asignadas
            </span>
          </div>
          <div className="mt-3 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[660px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Persona
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Empresa
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Tarea
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.currentMonthActiveAssignments.length ? (
                  state.currentMonthActiveAssignments.map((assignment) => {
                    const entry = state.currentMonthEntryMap.get(
                      entryKey(
                        state.month,
                        assignment.clientId,
                        assignment.templateId,
                      ),
                    );
                    return (
                      <tr
                        key={assignment.id}
                        className="border-t border-[var(--line)]"
                      >
                        <td className="px-4 py-2 font-medium text-gray-800">
                          {state.usersById.get(assignment.assigneeId)?.name ??
                            "Sin responsable"}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {assignment.clientName}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {assignment.activityName}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${entry?.completed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {entry?.completed ? "Completada" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      No hay responsabilidades activas para este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
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
            <button
              type="button"
              onClick={() => setIsCompanyModalOpen(true)}
              className="rounded-xl bg-[linear-gradient(180deg,#1f83cc_0%,#0f6cb4_100%)] px-4 py-2 text-sm font-medium text-white"
            >
              Alta de empresa
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr]">
            <input
              value={state.clientsSearchQuery}
              onChange={(event) =>
                state.setClientsSearchQuery(event.target.value)
              }
              className="soft-input h-10 px-3 text-sm"
              placeholder="Buscar empresa o contador..."
            />
            <select
              value={state.clientsMemberFilter}
              onChange={(event) =>
                state.setClientsMemberFilter(event.target.value)
              }
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
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("client")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("owner")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Contador</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("owner")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("group")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Grupo</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("group")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("checks")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Checks</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("checks")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("ventas")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Ventas</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("ventas")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("produccion")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Produccion</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("produccion")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("progress")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Avance</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("progress")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <button
                      type="button"
                      onClick={() => state.toggleClientsSort("lastCompletedAt")}
                      className="inline-flex items-center gap-1"
                    >
                      <span>Ultimo check</span>
                      <span className="text-[11px] text-gray-400">
                        {state.sortMarkerForClients("lastCompletedAt")}
                      </span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Accion
                  </th>
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
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {row.client.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.ownerName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.groupName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.completedCount}/{row.totalCount}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.ventas.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.produccion.toFixed(1)}%
                      </td>
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
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingClientId(row.client.id)}
                            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              state.openChecklistModal(row.client.id)
                            }
                            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Ver checklist
                          </button>
                          <Link
                            href={`/empresas/${row.client.id}/agenda`}
                            className="rounded-lg bg-[#0b315f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#08264b]"
                          >
                            Agenda anual
                          </Link>
                        </div>
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
                onClick={() =>
                  state.setClientsPage(
                    Math.max(1, state.clientsCurrentPage - 1),
                  )
                }
                disabled={state.clientsCurrentPage <= 1}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() =>
                  state.setClientsPage(
                    Math.min(
                      state.clientsTotalPages,
                      state.clientsCurrentPage + 1,
                    ),
                  )
                }
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
                <p className="status-pill text-[10px] text-[var(--foreground-soft)]">
                  Checklist
                </p>
                <h3 className="display-title text-xl font-semibold">
                  {state.checklistModalClient.name}
                </h3>
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
      {isCompanyModalOpen ? (
        <CompanyRegistrationModal
          state={state}
          onClose={() => setIsCompanyModalOpen(false)}
        />
      ) : null}
      {editingClientId ? (
        <CompanyEditModal
          clientId={editingClientId}
          state={state}
          onClose={() => setEditingClientId(null)}
        />
      ) : null}
    </EmpresasPageShell>
  );
}
