"use client";

import { EmpresasPageShell } from "@/features/empresas/components/empresas-page-shell";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";

const MEXICAN_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de Mexico",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de Mexico",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacan",
  "Morelos",
  "Nayarit",
  "Nuevo Leon",
  "Oaxaca",
  "Puebla",
  "Queretaro",
  "Quintana Roo",
  "San Luis Potosi",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatan",
  "Zacatecas",
];

const TAX_REGIMES = [
  "General de Ley Personas Morales",
  "Personas Morales con Fines no Lucrativos",
  "Simplificado de Confianza",
  "Personas Fisicas con Actividades Empresariales y Profesionales",
  "Incorporacion Fiscal",
  "Arrendamiento",
  "Sueldos y Salarios",
  "Sin obligaciones fiscales",
];

export function PlantillasPage() {
  const state = useEmpresasDashboardState();

  return (
    <EmpresasPageShell state={state}>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="surface rounded-3xl p-5">
          <h2 className="display-title text-xl font-semibold">
            Alta completa de empresa
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-soft)]">
            Datos fiscales, direccion, contactos y checklist base.
          </p>
          <form
            onSubmit={(event) => {
              void state.onCreateClient(event);
            }}
            className="mt-4 grid gap-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-[var(--foreground-soft)]">
                Nombre comercial
                <input
                  required
                  value={state.newClientName}
                  onChange={(event) =>
                    state.setNewClientName(event.target.value)
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="Ej. Contabilidad Pacifico"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Razon social
                <input
                  required
                  value={state.newClientDetails.legalName}
                  onChange={(event) =>
                    state.setNewClientDetails((current) => ({
                      ...current,
                      legalName: event.target.value,
                    }))
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="Ej. Pacifico SA de CV"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                RFC
                <input
                  required
                  maxLength={13}
                  value={state.newClientDetails.rfc}
                  onChange={(event) =>
                    state.setNewClientDetails((current) => ({
                      ...current,
                      rfc: event.target.value.toUpperCase(),
                    }))
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="XAXX010101000"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Regimen fiscal
                <select
                  required
                  value={state.newClientDetails.taxRegime}
                  onChange={(event) =>
                    state.setNewClientDetails((current) => ({
                      ...current,
                      taxRegime: event.target.value,
                    }))
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                >
                  <option value="">Selecciona regimen</option>
                  {TAX_REGIMES.map((regime) => (
                    <option key={regime} value={regime}>
                      {regime}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Referencia EKEY
                <input
                  value={state.newClientDetails.ekeyReference}
                  onChange={(event) =>
                    state.setNewClientDetails((current) => ({
                      ...current,
                      ekeyReference: event.target.value,
                    }))
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="Folio o ubicacion segura"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Contador responsable
                <select
                  value={state.assignableMemberValue}
                  onChange={(event) =>
                    state.setNewClientMemberId(event.target.value)
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                >
                  {state.assignableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="rounded-xl border border-[var(--line)] bg-white p-3">
              <legend className="px-1 text-xs font-semibold text-[var(--foreground-soft)]">
                Direccion fiscal
              </legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs text-[var(--foreground-soft)]">
                  Calle
                  <input
                    required
                    value={state.newClientDetails.street}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        street: event.target.value,
                      }))
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Numero exterior
                  <input
                    required
                    value={state.newClientDetails.exteriorNumber}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        exteriorNumber: event.target.value,
                      }))
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Numero interior
                  <input
                    value={state.newClientDetails.interiorNumber}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        interiorNumber: event.target.value,
                      }))
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Colonia
                  <input
                    value={state.newClientDetails.colony}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        colony: event.target.value,
                      }))
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Codigo postal
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    value={state.newClientDetails.postalCode}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        postalCode: event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 5),
                      }))
                    }
                    onBlur={() => void state.lookupPostalCode()}
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                    placeholder="Consulta al salir del campo"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Estado
                  <select
                    required
                    value={state.newClientDetails.state}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        state: event.target.value,
                      }))
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona estado</option>
                    {[
                      ...new Set([
                        ...MEXICAN_STATES,
                        ...state.postalCodeOptions.map(
                          (option) => option.state,
                        ),
                      ]),
                    ].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-[var(--foreground-soft)] md:col-span-2">
                  Ciudad o municipio
                  <select
                    required
                    value={state.newClientDetails.city}
                    onChange={(event) =>
                      state.setNewClientDetails((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  >
                    <option value="">
                      {state.postalLookupLoading
                        ? "Consultando codigo postal..."
                        : "Consulta el codigo postal para ver opciones"}
                    </option>
                    {state.postalCodeOptions
                      .filter(
                        (option) =>
                          !state.newClientDetails.state ||
                          option.state === state.newClientDetails.state,
                      )
                      .map((option) => (
                        <option
                          key={`${option.state}-${option.city}`}
                          value={option.city}
                        >
                          {option.city}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <legend className="px-1 text-xs font-semibold text-[var(--foreground-soft)]">
                  Contactos de la empresa
                </legend>
                <button
                  type="button"
                  onClick={() =>
                    state.setNewClientContacts((current) => [
                      ...current,
                      {
                        name: "",
                        position: "",
                        email: "",
                        phone: "",
                        whatsappPhone: "",
                        notes: "",
                        isPrimary: false,
                      },
                    ])
                  }
                  className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-medium"
                >
                  Agregar contacto
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {state.newClientContacts.map((contact, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-[var(--line)] p-3 md:grid-cols-2"
                  >
                    <input
                      required
                      value={contact.name}
                      onChange={(event) =>
                        state.setNewClientContacts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Nombre completo"
                    />
                    <input
                      value={contact.position}
                      onChange={(event) =>
                        state.setNewClientContacts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, position: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Cargo"
                    />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(event) =>
                        state.setNewClientContacts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, email: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Correo"
                    />
                    <input
                      value={contact.whatsappPhone}
                      onChange={(event) =>
                        state.setNewClientContacts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, whatsappPhone: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="WhatsApp o telefono"
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="primary-contact"
                        checked={contact.isPrimary}
                        onChange={() =>
                          state.setNewClientContacts((current) =>
                            current.map((item, itemIndex) => ({
                              ...item,
                              isPrimary: itemIndex === index,
                            })),
                          )
                        }
                      />
                      Contacto principal
                    </label>
                    <button
                      type="button"
                      disabled={state.newClientContacts.length === 1}
                      onClick={() =>
                        state.setNewClientContacts((current) =>
                          current
                            .filter((_, itemIndex) => itemIndex !== index)
                            .map((item, itemIndex) => ({
                              ...item,
                              isPrimary: item.isPrimary || itemIndex === 0,
                            })),
                        )
                      }
                      className="text-left text-xs font-medium text-red-700 disabled:opacity-40"
                    >
                      Quitar contacto
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="status-pill text-[11px] text-[var(--foreground-soft)]">
                Plantillas estandar para asignar
              </p>
              <div className="mt-2 grid max-h-44 gap-2 overflow-auto pr-1">
                {[...state.templates]
                  .filter((template) => template.isActive)
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((template) => {
                    const checked = state.selectedTemplateIds.includes(
                      template.id,
                    );
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
          <h2 className="display-title text-xl font-semibold">
            Catalogo de actividades estandar
          </h2>
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
              onChange={(event) =>
                state.setNewTemplateArea(
                  event.target.value as "VENTAS" | "PRODUCCION",
                )
              }
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
              onChange={(event) =>
                state.setNewTemplateWeight(Number(event.target.value))
              }
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
                    <tr
                      key={template.id}
                      className="odd:bg-white even:bg-[#f8fbff]"
                    >
                      <td className="border-t px-3 py-2 font-medium">
                        {template.name}
                      </td>
                      <td className="border-t px-3 py-2">{template.area}</td>
                      <td className="border-t px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={template.defaultWeight}
                          onChange={(event) => {
                            void state.updateTemplateWeight(
                              template,
                              Number(event.target.value),
                            );
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
