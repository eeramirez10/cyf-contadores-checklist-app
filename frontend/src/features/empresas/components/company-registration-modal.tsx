"use client";

import type { EmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";

type CompanyRegistrationModalProps = {
  state: EmpresasDashboardState;
  onClose: () => void;
};

const TAX_REGIMES = [
  "General de Ley Personas Morales",
  "Simplificado de Confianza",
  "Personas Fisicas con Actividades Empresariales y Profesionales",
  "Personas Morales con Fines no Lucrativos",
];

export function CompanyRegistrationModal({
  state,
  onClose,
}: CompanyRegistrationModalProps) {
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    if (await state.onCreateClient(event)) onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#10182885] p-4 backdrop-blur-[2px]">
      <div className="mx-auto my-6 w-[min(1040px,100%)] rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <p className="status-pill text-[10px] text-[var(--foreground-soft)]">
              Nueva empresa
            </p>
            <h2 className="display-title text-xl font-semibold">
              Alta completa de empresa
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>
        <form
          onSubmit={(event) => void submit(event)}
          className="grid gap-4 p-5"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-[var(--foreground-soft)]">
              Nombre comercial
              <input
                required
                value={state.newClientName}
                onChange={(event) => state.setNewClientName(event.target.value)}
                className="soft-input mt-1 w-full px-3 py-2 text-sm"
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
                  <option key={regime}>{regime}</option>
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

          <fieldset className="rounded-xl border border-[var(--line)] p-3">
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
                    ...new Set(
                      state.postalCodeOptions.map((option) => option.state),
                    ),
                  ].map((item) => (
                    <option key={item}>{item}</option>
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
                      ? "Consultando CP..."
                      : "Consulta el CP para ver opciones"}
                  </option>
                  {state.postalCodeOptions
                    .filter(
                      (option) => option.state === state.newClientDetails.state,
                    )
                    .map((option) => (
                      <option key={`${option.state}-${option.city}`}>
                        {option.city}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[var(--line)] p-3">
            <div className="flex items-center justify-between gap-3">
              <legend className="px-1 text-xs font-semibold text-[var(--foreground-soft)]">
                Contactos
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
                      name="modal-primary-contact"
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

          <fieldset className="rounded-xl border border-[var(--line)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--foreground-soft)]">
              Plantillas para el checklist
            </legend>
            <div className="mt-2 grid max-h-44 gap-2 overflow-auto">
              {state.checklistTemplates
                .filter((template) => template.isActive)
                .map((template) => {
                  const checked = state.selectedChecklistTemplateIds.includes(
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
                          {template.activityIds.length} actividades -{" "}
                          {template.scheduledMonths.length === 12
                            ? "Mensual"
                            : `${template.scheduledMonths.length} meses`}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          state.setSelectedChecklistTemplateIds((current) =>
                            checked
                              ? current.filter((id) => id !== template.id)
                              : [...current, template.id],
                          )
                        }
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </label>
                  );
                })}
            </div>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button className="rounded-xl bg-[linear-gradient(180deg,#1f83cc_0%,#0f6cb4_100%)] px-4 py-2 text-sm font-medium text-white">
              Crear empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
