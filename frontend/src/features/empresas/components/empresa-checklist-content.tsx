"use client";

import { Gauge } from "@/components/shared/gauge";
import type { EmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import {
  entryKey,
  formatCompletedAt,
} from "@/features/empresas/utils/empresas-helpers";
import type { Client, ClientActivity } from "@/lib/types";

type EmpresaChecklistContentProps = {
  state: EmpresasDashboardState;
  client: Client;
  activities: ClientActivity[];
  progress: number;
  ventas: number;
  produccion: number;
};

export function EmpresaChecklistContent({
  state,
  client,
  activities,
  progress,
  ventas,
  produccion,
}: EmpresaChecklistContentProps) {
  return (
    <>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Gauge label="Cumplimiento" value={progress} subtitle={client.name} />
        <Gauge label="Ventas" value={ventas} subtitle={client.name} />
        <Gauge label="Produccion" value={produccion} subtitle={client.name} />
      </div>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
        <p>
          <strong>Empresa:</strong> {client.name}
        </p>
        <p>
          <strong>Contador:</strong>{" "}
          {state.usersById.get(client.memberId)?.name ?? "Sin contador"}
        </p>
        <p>
          <strong>Grupo:</strong>{" "}
          {(() => {
            const member = state.usersById.get(client.memberId);
            if (!member?.groupId) {
              return "Sin grupo";
            }
            return state.groupsById.get(member.groupId)?.name ?? "Sin grupo";
          })()}
        </p>
      </div>

      <div className="mt-4 overflow-auto rounded-xl border border-[var(--line)]">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-3 py-2 text-left">Actividad</th>
              <th className="px-3 py-2 text-left">Area</th>
              <th className="px-3 py-2 text-left">Peso</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Responsable</th>
              <th className="px-3 py-2 text-left">Ultimo usuario</th>
              <th className="px-3 py-2 text-center">Activo</th>
              <th className="px-3 py-2 text-center">Check</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const currentEntry = state.currentMonthEntryMap.get(
                entryKey(state.month, client.id, activity.templateId),
              );
              const assignment = state.currentMonthAssignmentMap.get(
                entryKey(state.month, client.id, activity.templateId),
              );
              const isResponsible =
                state.currentUser?.role === "ADMIN" ||
                assignment?.assigneeId === state.currentUser?.id;
              const canToggle =
                Boolean(assignment?.isActive) &&
                isResponsible &&
                (!currentEntry?.completed || Boolean(state.canUncheck));

              return (
                <tr
                  key={activity.id}
                  className="odd:bg-white even:bg-[#f8fbff] hover:bg-[#edf5ff]"
                >
                  <td className="border-t px-3 py-2 font-medium">
                    {activity.name}
                  </td>
                  <td className="border-t px-3 py-2">
                    <span className="status-pill rounded-full bg-[#eff5fd] px-2 py-1 text-[11px] text-[var(--foreground-soft)]">
                      {activity.area}
                    </span>
                  </td>
                  <td className="border-t px-3 py-2">{activity.weight}%</td>
                  <td className="border-t px-3 py-2 font-mono text-xs text-[var(--foreground-soft)]">
                    {currentEntry?.completed
                      ? formatCompletedAt(currentEntry.completedAt)
                      : ""}
                  </td>
                  <td className="border-t px-3 py-2 text-xs">
                    {state.canManageAssignments ? (
                      <select
                        value={assignment?.assigneeId ?? ""}
                        onChange={(event) => {
                          if (!event.target.value) return;
                          void state.updateChecklistAssignment(
                            client.id,
                            activity.templateId,
                            event.target.value,
                            assignment?.isActive ?? true,
                          );
                        }}
                        className="soft-input min-w-36 px-2 py-1 text-xs"
                      >
                        {state.assignableMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      (state.usersById.get(assignment?.assigneeId ?? "")
                        ?.name ?? "Sin responsable")
                    )}
                  </td>
                  <td className="border-t px-3 py-2 text-xs text-[var(--foreground-soft)]">
                    {currentEntry?.completedBy
                      ? (state.usersById.get(currentEntry.completedBy)?.name ??
                        "N/A")
                      : ""}
                  </td>
                  <td className="border-t px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(assignment?.isActive)}
                      disabled={!state.canManageAssignments || !assignment}
                      onChange={(event) => {
                        if (!assignment) return;
                        void state.updateChecklistAssignment(
                          client.id,
                          activity.templateId,
                          assignment.assigneeId,
                          event.target.checked,
                        );
                      }}
                      title="Activar o desactivar responsabilidad mensual"
                      className="h-4 w-4 accent-[var(--accent)] disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="border-t px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(currentEntry?.completed)}
                      onChange={() => {
                        void state.toggleChecklist(
                          client.id,
                          activity.templateId,
                        );
                      }}
                      disabled={!canToggle}
                      title={
                        canToggle
                          ? "Actualizar check"
                          : "Solo el responsable activo puede completar esta tarea"
                      }
                      className="h-4 w-4 cursor-pointer rounded border-[var(--line-strong)] accent-[var(--accent)] disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
