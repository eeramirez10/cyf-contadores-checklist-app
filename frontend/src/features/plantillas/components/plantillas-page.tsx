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
const ALL_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export function PlantillasPage() {
  const state = useEmpresasDashboardState();
  const [activityAreaId, setActivityAreaId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null | "new">(null);
  const [packageName, setPackageName] = useState("");
  const [packageMonths, setPackageMonths] = useState<number[]>(ALL_MONTHS);
  const [packageActivityIds, setPackageActivityIds] = useState<string[]>([]);
  const [activityQuery, setActivityQuery] = useState("");
  const selectedArea =
    state.areas.find((area) => area.id === activityAreaId) ?? null;
  const selectedPackage =
    state.checklistTemplates.find((item) => item.id === packageId) ?? null;

  const openPackage = (id: string | "new") => {
    const item = state.checklistTemplates.find(
      (template) => template.id === id,
    );
    setPackageId(id);
    setPackageName(item?.name ?? "");
    setPackageMonths(item?.scheduledMonths ?? ALL_MONTHS);
    setPackageActivityIds(item?.activityIds ?? []);
    setActivityQuery("");
  };
  const toggleMonth = (month: number) =>
    setPackageMonths((current) =>
      current.includes(month)
        ? current.filter((item) => item !== month)
        : [...current, month].sort((a, b) => a - b),
    );
  const toggleActivity = (id: string) =>
    setPackageActivityIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const savePackage = async () => {
    if (
      await state.saveChecklistTemplate({
        id: selectedPackage?.id,
        name: packageName,
        scheduledMonths: packageMonths,
        activityIds: packageActivityIds,
      })
    )
      setPackageId(null);
  };
  const filteredActivities = state.templates.filter(
    (item) =>
      item.name.toLowerCase().includes(activityQuery.trim().toLowerCase()) ||
      item.area.toLowerCase().includes(activityQuery.trim().toLowerCase()),
  );

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4">
        <article className="surface rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="display-title text-xl font-semibold">
                Plantillas de checklist
              </h2>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Agrupa actividades y define una sola periodicidad para todo el
                paquete.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPackage("new")}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Nueva plantilla
            </button>
          </div>
          <div className="mt-5 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left">Plantilla</th>
                  <th className="px-4 py-3 text-left">Actividades</th>
                  <th className="px-4 py-3 text-left">Periodicidad</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.checklistTemplates.length ? (
                  state.checklistTemplates.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-[var(--line)] odd:bg-white even:bg-[#f8fbff]"
                    >
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">{item.activityIds.length}</td>
                      <td className="px-4 py-3">
                        {item.scheduledMonths.length === 12
                          ? "Mensual"
                          : item.scheduledMonths
                              .map((month) => MONTHS[month - 1])
                              .join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openPackage(item.id)}
                          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
                        >
                          Editar plantilla
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      Crea una plantilla para asignar paquetes de trabajo a las
                      empresas.
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
              <h2 className="display-title text-xl font-semibold">
                Áreas y actividades
              </h2>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Las actividades son el catálogo base que se incorpora a las
                plantillas.
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
                placeholder="Nueva área"
              />
              <button className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium">
                Crear área
              </button>
            </form>
          </div>
          <div className="mt-5 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-left">Actividades</th>
                  <th className="px-4 py-3 text-left">Peso activo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.areas.map((area) => {
                  const activities = state.templates.filter(
                    (item) => item.area === area.name,
                  );
                  return (
                    <tr key={area.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3 font-medium">{area.name}</td>
                      <td className="px-4 py-3">{activities.length}</td>
                      <td className="px-4 py-3">
                        {activities
                          .filter((item) => item.isActive)
                          .reduce((sum, item) => sum + item.defaultWeight, 0)}
                        %
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!area.isActive}
                          onClick={() => {
                            state.setNewTemplateAreaId(area.id);
                            setActivityAreaId(area.id);
                          }}
                          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                        >
                          Agregar actividad
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {packageId ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#10182885] p-4 backdrop-blur-[2px]">
          <div className="mx-auto my-[5vh] w-[min(820px,100%)] rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-xs text-[var(--foreground-soft)]">
                  Paquete de trabajo
                </p>
                <h3 className="display-title text-xl font-semibold">
                  {selectedPackage ? "Editar plantilla" : "Nueva plantilla"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPackageId(null)}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-5 p-5">
              <label className="text-xs text-[var(--foreground-soft)]">
                Nombre
                <input
                  required
                  value={packageName}
                  onChange={(event) => setPackageName(event.target.value)}
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="Ej. Fiscal mensual"
                />
              </label>
              <fieldset>
                <legend className="text-xs text-[var(--foreground-soft)]">
                  Periodicidad de toda la plantilla
                </legend>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {MONTHS.map((label, index) => {
                    const month = index + 1;
                    return (
                      <label
                        key={month}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${packageMonths.includes(month) ? "border-[var(--accent)] bg-blue-50" : "border-[var(--line)]"}`}
                      >
                        <input
                          type="checkbox"
                          checked={packageMonths.includes(month)}
                          onChange={() => toggleMonth(month)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs text-[var(--foreground-soft)]">
                  Actividades incluidas ({packageActivityIds.length})
                </legend>
                <input
                  value={activityQuery}
                  onChange={(event) => setActivityQuery(event.target.value)}
                  className="soft-input mt-2 w-full px-3 py-2 text-sm"
                  placeholder="Buscar por actividad o área"
                />
                <div className="mt-2 grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">
                  {filteredActivities.map((activity) => (
                    <label
                      key={activity.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--line)] p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={packageActivityIds.includes(activity.id)}
                        onChange={() => toggleActivity(activity.id)}
                      />
                      <span>
                        {activity.name}
                        <span className="block text-xs text-[var(--foreground-soft)]">
                          {activity.area} · {activity.defaultWeight}%
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPackageId(null)}
                  className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void savePackage()}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Guardar plantilla
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedArea ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#10182885] p-4 backdrop-blur-[2px]">
          <div className="mx-auto mt-[10vh] w-[min(560px,100%)] rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]">
            <form
              onSubmit={async (event) => {
                if (await state.onCreateTemplate(event))
                  setActivityAreaId(null);
              }}
              className="grid gap-4 p-5"
            >
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-[var(--foreground-soft)]">
                    {selectedArea.name}
                  </p>
                  <h3 className="display-title text-xl font-semibold">
                    Agregar actividad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActivityAreaId(null)}
                  className="text-sm"
                >
                  Cerrar
                </button>
              </div>
              <input
                required
                value={state.newTemplateName}
                onChange={(event) =>
                  state.setNewTemplateName(event.target.value)
                }
                className="soft-input px-3 py-2"
                placeholder="Actividad"
              />
              <input
                required
                type="number"
                min={1}
                max={100}
                value={state.newTemplateWeight}
                onChange={(event) =>
                  state.setNewTemplateWeight(Number(event.target.value))
                }
                className="soft-input px-3 py-2"
                placeholder="Peso"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActivityAreaId(null)}
                  className="rounded-xl border border-[var(--line)] px-4 py-2"
                >
                  Cancelar
                </button>
                <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white">
                  Guardar actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </EmpresasPageShell>
  );
}
