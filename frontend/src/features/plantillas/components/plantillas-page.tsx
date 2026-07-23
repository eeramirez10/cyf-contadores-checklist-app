"use client";

import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";

export function PlantillasPage() {
  const state = useEmpresasDashboardState();

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="surface rounded-3xl p-5">
          <h2 className="display-title text-xl font-semibold">Alta de empresa con estandar</h2>
          <p className="mt-1 text-sm text-[var(--foreground-soft)]">
            Crea empresa y asigna checklist base desde plantillas.
          </p>
          <form
            onSubmit={(event) => {
              void state.onCreateClient(event);
            }}
            className="mt-4 grid gap-3"
          >
            <label className="text-xs text-[var(--foreground-soft)]">
              Nombre de la empresa
              <input
                value={state.newClientName}
                onChange={(event) => state.setNewClientName(event.target.value)}
                className="soft-input mt-1 w-full px-3 py-2 text-sm"
                placeholder="Ej. Contabilidad Pacifico"
              />
            </label>
            <label className="text-xs text-[var(--foreground-soft)]">
              Contador
              <select
                value={state.assignableMemberValue}
                onChange={(event) => state.setNewClientMemberId(event.target.value)}
                className="soft-input mt-1 w-full px-3 py-2 text-sm"
              >
                {state.assignableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="status-pill text-[11px] text-[var(--foreground-soft)]">
                Plantillas estandar para asignar
              </p>
              <div className="mt-2 grid max-h-44 gap-2 overflow-auto pr-1">
                {[...state.templates]
                  .filter((template) => template.isActive)
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((template) => {
                    const checked = state.selectedTemplateIds.includes(template.id);
                    return (
                      <label
                        key={template.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
                      >
                        <span>
                          {template.name}
                          <span className="ml-2 text-xs text-[var(--foreground-soft)]">
                            {template.defaultWeight}% - {template.area}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            state.setSelectedTemplateIds((current) =>
                              checked
                                ? current.filter((id) => id !== template.id)
                                : [...current, template.id],
                            );
                          }}
                          className="h-4 w-4 accent-[var(--accent)]"
                        />
                      </label>
                    );
                  })}
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[linear-gradient(180deg,#1f83cc_0%,#0f6cb4_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_22px_rgba(11,83,142,0.28)] transition hover:translate-y-[-1px]"
            >
              Crear empresa con checklist base
            </button>
          </form>
        </article>

        <article className="surface rounded-3xl p-5">
          <h2 className="display-title text-xl font-semibold">Catalogo de actividades estandar</h2>
          <p className="mt-1 text-sm text-[var(--foreground-soft)]">
            Crear, activar/inactivar y ajustar peso base.
          </p>
          <form
            onSubmit={(event) => {
              void state.onCreateTemplate(event);
            }}
            className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]"
          >
            <input
              value={state.newTemplateName}
              onChange={(event) => state.setNewTemplateName(event.target.value)}
              className="soft-input px-3 py-2 text-sm"
              placeholder="Nueva actividad estandar"
            />
            <select
              value={state.newTemplateArea}
              onChange={(event) => state.setNewTemplateArea(event.target.value as "VENTAS" | "PRODUCCION")}
              className="soft-input px-3 py-2 text-sm"
            >
              <option value="VENTAS">Ventas</option>
              <option value="PRODUCCION">Produccion</option>
            </select>
            <input
              type="number"
              min={1}
              max={100}
              value={state.newTemplateWeight}
              onChange={(event) => state.setNewTemplateWeight(Number(event.target.value))}
              className="soft-input w-24 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Agregar
            </button>
          </form>

          <div className="mt-4 max-h-[320px] overflow-auto rounded-xl border border-[var(--line)] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-3 py-2 text-left">Actividad</th>
                  <th className="px-3 py-2 text-left">Area</th>
                  <th className="px-3 py-2 text-left">Peso</th>
                  <th className="px-3 py-2 text-left">Activo</th>
                </tr>
              </thead>
              <tbody>
                {[...state.templates]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((template) => (
                    <tr key={template.id} className="odd:bg-white even:bg-[#f8fbff]">
                      <td className="border-t px-3 py-2 font-medium">{template.name}</td>
                      <td className="border-t px-3 py-2">{template.area}</td>
                      <td className="border-t px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={template.defaultWeight}
                          onChange={(event) => {
                            void state.updateTemplateWeight(template, Number(event.target.value));
                          }}
                          className="soft-input w-20 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="border-t px-3 py-2">
                        <input
                          type="checkbox"
                          checked={template.isActive}
                          onChange={() => {
                            void state.toggleTemplateActive(template);
                          }}
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
