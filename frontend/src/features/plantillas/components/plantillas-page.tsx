"use client";

import { useState } from "react";
import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function PlantillasPage() {
  const state = useEmpresasDashboardState();
  const [activityAreaId, setActivityAreaId] = useState<string | null>(null);
  const [managedAreaId, setManagedAreaId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [editingMonths, setEditingMonths] = useState<number[]>([]);
  const selectedArea =
    state.areas.find((area) => area.id === activityAreaId) ?? null;
  const managedArea =
    state.areas.find((area) => area.id === managedAreaId) ?? null;
  const managedTemplates = state.templates
    .filter((template) => template.area === managedArea?.name)
    .sort((left, right) => left.displayOrder - right.displayOrder);

  const openActivityModal = (areaId: string) => {
    state.setNewTemplateAreaId(areaId);
    setActivityAreaId(areaId);
  };

  const submitActivity = async (event: React.FormEvent<HTMLFormElement>) => {
    if (await state.onCreateTemplate(event)) setActivityAreaId(null);
  };

  const startEditingSchedule = (template: (typeof state.templates)[number]) => {
    setEditingTemplateId(template.id);
    setEditingMonths(template.scheduledMonths);
  };

  const saveSchedule = async (template: (typeof state.templates)[number]) => {
    if (await state.updateTemplateScheduledMonths(template, editingMonths)) {
      setEditingTemplateId(null);
      setEditingMonths([]);
    }
  };

  const toggleEditingMonth = (month: number) => {
    setEditingMonths((current) =>
      current.includes(month)
        ? current.filter((item) => item !== month)
        : [...current, month].sort((left, right) => left - right),
    );
  };

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4">
        <article className="surface rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display-title text-xl font-semibold">
                Areas de trabajo
              </h2>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Organiza las actividades del checklist por area.
              </p>
            </div>
            <form
              onSubmit={(event) => void state.onCreateArea(event)}
              className="flex gap-2"
            >
              <input
                value={state.newAreaName}
                onChange={(event) => state.setNewAreaName(event.target.value)}
                className="soft-input w-48 px-3 py-2 text-sm"
                placeholder="Nueva area"
              />
              <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
                Crear area
              </button>
            </form>
          </div>

          <div className="mt-5 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left">Area</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Actividades</th>
                  <th className="px-4 py-3 text-left">Activas</th>
                  <th className="px-4 py-3 text-left">Peso acumulado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.areas.length ? (
                  state.areas.map((area) => {
                    const templates = state.templates.filter(
                      (template) => template.area === area.name,
                    );
                    const activeTemplates = templates.filter(
                      (template) => template.isActive,
                    );
                    const totalWeight = activeTemplates.reduce(
                      (total, template) => total + template.defaultWeight,
                      0,
                    );
                    return (
                      <tr
                        key={area.id}
                        className="border-t border-[var(--line)] odd:bg-white even:bg-[#f8fbff]"
                      >
                        <td className="px-4 py-3 font-medium">{area.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${area.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}
                          >
                            {area.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{templates.length}</td>
                        <td className="px-4 py-3">{activeTemplates.length}</td>
                        <td className="px-4 py-3">{totalWeight.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setManagedAreaId(area.id)}
                              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                            >
                              Ver actividades
                            </button>
                            <button
                              type="button"
                              disabled={!area.isActive}
                              onClick={() => openActivityModal(area.id)}
                              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Agregar actividad
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      Crea la primera area de trabajo para agregar actividades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {selectedArea ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#10182885] p-4 backdrop-blur-[2px]">
          <div className="mx-auto mt-[10vh] w-[min(560px,100%)] rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="status-pill text-[10px] text-[var(--foreground-soft)]">
                  {selectedArea.name}
                </p>
                <h3 className="display-title text-xl font-semibold">
                  Agregar actividad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivityAreaId(null)}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
            <form
              onSubmit={(event) => void submitActivity(event)}
              className="grid gap-4 p-5"
            >
              <label className="text-xs text-[var(--foreground-soft)]">
                Actividad
                <input
                  required
                  value={state.newTemplateName}
                  onChange={(event) =>
                    state.setNewTemplateName(event.target.value)
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="Ej. Declaracion mensual"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Peso base (%)
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  value={state.newTemplateWeight}
                  onChange={(event) =>
                    state.setNewTemplateWeight(Number(event.target.value))
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <fieldset>
                <legend className="text-xs text-[var(--foreground-soft)]">
                  Meses aplicables
                </legend>
                <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                  La actividad solo se exigira en los meses seleccionados.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {MONTHS.map((label, index) => {
                    const month = index + 1;
                    const selected =
                      state.newTemplateScheduledMonths.includes(month);
                    return (
                      <label
                        key={month}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${selected ? "border-[var(--accent)] bg-blue-50 text-blue-800" : "border-[var(--line)] text-[var(--foreground-soft)]"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            state.setNewTemplateScheduledMonths((current) =>
                              selected
                                ? current.filter((item) => item !== month)
                                : [...current, month].sort(
                                    (left, right) => left - right,
                                  ),
                            )
                          }
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActivityAreaId(null)}
                  className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
                  Guardar actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {managedArea ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#10182885] p-4 backdrop-blur-[2px]">
          <div className="mx-auto mt-[7vh] w-[min(760px,100%)] rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="status-pill text-[10px] text-[var(--foreground-soft)]">
                  {managedArea.name}
                </p>
                <h3 className="display-title text-xl font-semibold">
                  Actividades y periodicidad
                </h3>
                <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                  Los cambios se aplican a empresas nuevas; el historial
                  existente no se modifica.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManagedAreaId(null);
                  setEditingTemplateId(null);
                }}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto p-5">
              {managedTemplates.length ? (
                managedTemplates.map((template) => {
                  const isEditing = editingTemplateId === template.id;
                  return (
                    <article
                      key={template.id}
                      className="rounded-xl border border-[var(--line)] bg-[#fbfdff] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {template.name}
                          </h4>
                          <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                            Peso {template.defaultWeight}% ·{" "}
                            {template.isActive ? "Activa" : "Inactiva"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                            {template.scheduledMonths.length === 12
                              ? "Mensual"
                              : template.scheduledMonths
                                  .map((month) => MONTHS[month - 1])
                                  .join(", ")}
                          </p>
                        </div>
                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => startEditingSchedule(template)}
                            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium hover:bg-white"
                          >
                            Editar periodicidad
                          </button>
                        ) : null}
                      </div>
                      {isEditing ? (
                        <div className="mt-4 border-t border-[var(--line)] pt-4">
                          <p className="text-xs font-medium text-[var(--foreground-soft)]">
                            Meses aplicables
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {MONTHS.map((label, index) => {
                              const month = index + 1;
                              const selected = editingMonths.includes(month);
                              return (
                                <label
                                  key={month}
                                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${selected ? "border-[var(--accent)] bg-blue-50 text-blue-800" : "border-[var(--line)] text-[var(--foreground-soft)]"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleEditingMonth(month)}
                                  />
                                  {label}
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingTemplateId(null)}
                              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveSchedule(template)}
                              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                            >
                              Guardar periodicidad
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <p className="py-8 text-center text-sm text-[var(--foreground-soft)]">
                  Esta area aun no tiene actividades.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </EmpresasPageShell>
  );
}
