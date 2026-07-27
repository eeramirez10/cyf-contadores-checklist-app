"use client";

import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";

export function PlantillasPage() {
  const state = useEmpresasDashboardState();
  const activeAreas = state.areas.filter((area) => area.isActive);

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="surface rounded-3xl p-5">
          <h2 className="display-title text-xl font-semibold">
            Areas de trabajo
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-soft)]">
            Crea primero el area y despues asigna sus actividades.
          </p>
          <form
            onSubmit={(event) => void state.onCreateArea(event)}
            className="mt-4 flex gap-2"
          >
            <input
              value={state.newAreaName}
              onChange={(event) => state.setNewAreaName(event.target.value)}
              className="soft-input min-w-0 flex-1 px-3 py-2 text-sm"
              placeholder="Ej. Impuestos"
            />
            <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
              Crear area
            </button>
          </form>
          <div className="mt-4 grid gap-2">
            {state.areas.length ? (
              state.areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => state.setNewTemplateAreaId(area.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${state.newTemplateAreaId === area.id ? "border-[var(--accent)] bg-[#eef7ff]" : "border-[var(--line)] bg-white"}`}
                >
                  <span className="font-medium">{area.name}</span>
                  <span className="ml-2 text-xs text-[var(--foreground-soft)]">
                    {area.isActive ? "Activa" : "Inactiva"}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-[var(--foreground-soft)]">
                Aun no hay areas. Crea la primera para continuar.
              </p>
            )}
          </div>
        </article>

        <article className="surface rounded-3xl p-5">
          <h2 className="display-title text-xl font-semibold">
            Actividades estandar
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-soft)]">
            Cada actividad pertenece a un area y tiene un peso base para el
            checklist.
          </p>
          <form
            onSubmit={(event) => void state.onCreateTemplate(event)}
            className="mt-4 grid gap-2 md:grid-cols-[1fr_0.9fr_100px_auto]"
          >
            <input
              value={state.newTemplateName}
              onChange={(event) => state.setNewTemplateName(event.target.value)}
              className="soft-input px-3 py-2 text-sm"
              placeholder="Nueva actividad"
            />
            <select
              value={state.newTemplateAreaId}
              onChange={(event) =>
                state.setNewTemplateAreaId(event.target.value)
              }
              className="soft-input px-3 py-2 text-sm"
            >
              <option value="">Selecciona area</option>
              {activeAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={100}
              value={state.newTemplateWeight}
              onChange={(event) =>
                state.setNewTemplateWeight(Number(event.target.value))
              }
              className="soft-input px-3 py-2 text-sm"
              aria-label="Peso"
            />
            <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
              Agregar
            </button>
          </form>
          <div className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-[var(--line)] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-3 py-2 text-left">Area</th>
                  <th className="px-3 py-2 text-left">Actividad</th>
                  <th className="px-3 py-2 text-left">Peso</th>
                  <th className="px-3 py-2 text-left">Activa</th>
                </tr>
              </thead>
              <tbody>
                {[...state.templates]
                  .sort(
                    (left, right) =>
                      left.area.localeCompare(right.area) ||
                      left.displayOrder - right.displayOrder,
                  )
                  .map((template) => (
                    <tr
                      key={template.id}
                      className="odd:bg-white even:bg-[#f8fbff]"
                    >
                      <td className="border-t px-3 py-2 text-[var(--foreground-soft)]">
                        {template.area}
                      </td>
                      <td className="border-t px-3 py-2 font-medium">
                        {template.name}
                      </td>
                      <td className="border-t px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={template.defaultWeight}
                          onChange={(event) =>
                            void state.updateTemplateWeight(
                              template,
                              Number(event.target.value),
                            )
                          }
                          className="soft-input w-20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="border-t px-3 py-2">
                        <input
                          type="checkbox"
                          checked={template.isActive}
                          onChange={() =>
                            void state.toggleTemplateActive(template)
                          }
                          className="h-4 w-4 accent-[var(--accent)]"
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </EmpresasPageShell>
  );
}
