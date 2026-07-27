"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { EmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { backendFetch } from "@/lib/backend-auth";

type CompanyContact = {
  id?: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  notes: string;
  isPrimary: boolean;
};

type CompanyDetails = {
  id: string;
  name: string;
  legal_name: string | null;
  rfc: string | null;
  tax_regime: string | null;
  ekey_reference: string | null;
  address_street: string | null;
  address_ext_no: string | null;
  address_int_no: string | null;
  address_colony: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  member_id: string;
  is_active: boolean;
  contacts: {
    id: string;
    name: string;
    position: string | null;
    email: string | null;
    phone: string | null;
    whatsapp_phone: string | null;
    notes: string | null;
    is_primary: boolean;
  }[];
  checklist_template_assignments: { checklist_template_id: string }[];
};

type CompanyEditModalProps = {
  clientId: string;
  state: EmpresasDashboardState;
  onClose: () => void;
};

type PostalCodeOption = { state: string; city: string };

const TAX_REGIMES = [
  "General de Ley Personas Morales",
  "Simplificado de Confianza",
  "Personas Fisicas con Actividades Empresariales y Profesionales",
  "Personas Morales con Fines no Lucrativos",
];

const emptyContact = (isPrimary = false): CompanyContact => ({
  name: "",
  position: "",
  email: "",
  phone: "",
  whatsappPhone: "",
  notes: "",
  isPrimary,
});

const textValue = (value: string | null): string => value ?? "";

export function CompanyEditModal({
  clientId,
  state,
  onClose,
}: CompanyEditModalProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [postalCodeOptions, setPostalCodeOptions] = useState<
    PostalCodeOption[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postalLookupLoading, setPostalLookupLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const details = await backendFetch<CompanyDetails>(
          `/companies/${clientId}`,
        );
        if (!active) return;
        setCompany(details);
        setContacts(
          details.contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            position: textValue(contact.position),
            email: textValue(contact.email),
            phone: textValue(contact.phone),
            whatsappPhone: textValue(contact.whatsapp_phone),
            notes: textValue(contact.notes),
            isPrimary: contact.is_primary,
          })),
        );
        setSelectedTemplateIds(
          details.checklist_template_assignments.map(
            (assignment) => assignment.checklist_template_id,
          ),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la empresa.",
        );
        onClose();
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [clientId, onClose]);

  const updateCompany = <Key extends keyof CompanyDetails>(
    key: Key,
    value: CompanyDetails[Key],
  ) => {
    setCompany((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateContact = (
    index: number,
    field: keyof CompanyContact,
    value: string | boolean,
  ) => {
    setContacts((current) =>
      current.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const lookupPostalCode = async () => {
    const postalCode = company?.address_postal_code?.trim() ?? "";
    if (!/^\d{5}$/.test(postalCode)) return;
    setPostalLookupLoading(true);
    try {
      const result = await backendFetch<{ options: PostalCodeOption[] }>(
        `/companies/postal-codes/${postalCode}`,
      );
      setPostalCodeOptions(result.options);
      const first = result.options[0];
      if (first) {
        setCompany((current) =>
          current
            ? {
                ...current,
                address_state: first.state,
                address_city: first.city,
              }
            : current,
        );
      }
    } catch (error) {
      setPostalCodeOptions([]);
      toast.warning(
        error instanceof Error
          ? error.message
          : "No se encontro el codigo postal.",
      );
    } finally {
      setPostalLookupLoading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company || saving) return;
    if (!selectedTemplateIds.length) {
      toast.warning("Selecciona al menos una plantilla de checklist.");
      return;
    }
    if (
      contacts.some(
        (contact) =>
          !contact.name.trim() ||
          (!contact.email.trim() &&
            !contact.phone.trim() &&
            !contact.whatsappPhone.trim()),
      )
    ) {
      toast.warning(
        "Cada contacto requiere nombre y al menos un medio de contacto.",
      );
      return;
    }

    setSaving(true);
    try {
      await backendFetch<{ clientId: string }>(`/companies/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          legalName: company.legal_name,
          rfc: company.rfc,
          taxRegime: company.tax_regime,
          ekeyReference: company.ekey_reference || undefined,
          address: {
            street: company.address_street,
            exteriorNumber: company.address_ext_no,
            interiorNumber: company.address_int_no || undefined,
            colony: company.address_colony || undefined,
            postalCode: company.address_postal_code,
            city: company.address_city,
            state: company.address_state,
            country: company.address_country || "Mexico",
          },
          contacts,
          memberId: company.member_id,
          isActive: company.is_active,
          checklistTemplateIds: selectedTemplateIds,
        }),
      });
      await state.loadData();
      toast.success(
        "Empresa actualizada. El historial de checklist se conserva.",
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la empresa.",
      );
    } finally {
      setSaving(false);
    }
  };

  const stateOptions = [
    ...new Set([
      company?.address_state ?? "",
      ...postalCodeOptions.map((option) => option.state),
    ]),
  ].filter(Boolean);
  const cityOptions = [
    ...new Set([
      company?.address_city ?? "",
      ...postalCodeOptions
        .filter((option) => option.state === company?.address_state)
        .map((option) => option.city),
    ]),
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#10182885] p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="mx-auto my-6 w-[min(1040px,100%)] rounded-2xl border border-[var(--line)] bg-white shadow-[0_22px_40px_rgba(16,24,40,0.35)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white px-5 py-4">
          <div>
            <p className="status-pill text-[10px] text-[var(--foreground-soft)]">
              Configuracion de empresa
            </p>
            <h2 className="display-title text-xl font-semibold">
              Editar empresa
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

        {loading || !company ? (
          <p className="p-6 text-sm text-[var(--foreground-soft)]">
            Cargando datos de la empresa...
          </p>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="grid gap-4 p-5"
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Los cambios a plantillas actualizan las tareas operativas. Los
              checks y entregas documentales ya registrados se conservan.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-[var(--foreground-soft)]">
                Nombre comercial
                <input
                  required
                  value={company.name}
                  onChange={(event) =>
                    updateCompany("name", event.target.value)
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Razon social
                <input
                  required
                  value={textValue(company.legal_name)}
                  onChange={(event) =>
                    updateCompany("legal_name", event.target.value)
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                RFC
                <input
                  required
                  maxLength={13}
                  value={textValue(company.rfc)}
                  onChange={(event) =>
                    updateCompany("rfc", event.target.value.toUpperCase())
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Regimen fiscal
                <select
                  required
                  value={textValue(company.tax_regime)}
                  onChange={(event) =>
                    updateCompany("tax_regime", event.target.value)
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
                  value={textValue(company.ekey_reference)}
                  onChange={(event) =>
                    updateCompany("ekey_reference", event.target.value)
                  }
                  className="soft-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--foreground-soft)]">
                Contador responsable
                <select
                  required
                  value={company.member_id}
                  onChange={(event) =>
                    updateCompany("member_id", event.target.value)
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
              <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={company.is_active}
                  onChange={(event) =>
                    updateCompany("is_active", event.target.checked)
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Empresa activa y disponible en los tableros
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
                    value={textValue(company.address_street)}
                    onChange={(event) =>
                      updateCompany("address_street", event.target.value)
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Numero exterior
                  <input
                    required
                    value={textValue(company.address_ext_no)}
                    onChange={(event) =>
                      updateCompany("address_ext_no", event.target.value)
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Numero interior
                  <input
                    value={textValue(company.address_int_no)}
                    onChange={(event) =>
                      updateCompany("address_int_no", event.target.value)
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Colonia
                  <input
                    value={textValue(company.address_colony)}
                    onChange={(event) =>
                      updateCompany("address_colony", event.target.value)
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
                    value={textValue(company.address_postal_code)}
                    onChange={(event) =>
                      updateCompany(
                        "address_postal_code",
                        event.target.value.replace(/\D/g, "").slice(0, 5),
                      )
                    }
                    onBlur={() => void lookupPostalCode()}
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--foreground-soft)]">
                  Estado
                  <select
                    required
                    value={textValue(company.address_state)}
                    onChange={(event) =>
                      updateCompany("address_state", event.target.value)
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona estado</option>
                    {stateOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-[var(--foreground-soft)] md:col-span-2">
                  Ciudad o municipio
                  <select
                    required
                    value={textValue(company.address_city)}
                    onChange={(event) =>
                      updateCompany("address_city", event.target.value)
                    }
                    className="soft-input mt-1 w-full px-3 py-2 text-sm"
                  >
                    <option value="">
                      {postalLookupLoading
                        ? "Consultando CP..."
                        : "Consulta el CP para ver opciones"}
                    </option>
                    {cityOptions.map((option) => (
                      <option key={option}>{option}</option>
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
                    setContacts((current) => [
                      ...current,
                      emptyContact(current.length === 0),
                    ])
                  }
                  className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-medium"
                >
                  Agregar contacto
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {contacts.map((contact, index) => (
                  <div
                    key={contact.id ?? `new-${index}`}
                    className="grid gap-2 rounded-lg border border-[var(--line)] p-3 md:grid-cols-2"
                  >
                    <input
                      required
                      value={contact.name}
                      onChange={(event) =>
                        updateContact(index, "name", event.target.value)
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Nombre completo"
                    />
                    <input
                      value={contact.position}
                      onChange={(event) =>
                        updateContact(index, "position", event.target.value)
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Cargo"
                    />
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(event) =>
                        updateContact(index, "email", event.target.value)
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Correo"
                    />
                    <input
                      value={contact.phone}
                      onChange={(event) =>
                        updateContact(index, "phone", event.target.value)
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Telefono"
                    />
                    <input
                      value={contact.whatsappPhone}
                      onChange={(event) =>
                        updateContact(
                          index,
                          "whatsappPhone",
                          event.target.value,
                        )
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="WhatsApp"
                    />
                    <input
                      value={contact.notes}
                      onChange={(event) =>
                        updateContact(index, "notes", event.target.value)
                      }
                      className="soft-input px-3 py-2 text-sm"
                      placeholder="Notas"
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name={`edit-primary-contact-${clientId}`}
                        checked={contact.isPrimary}
                        onChange={() =>
                          setContacts((current) =>
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
                      disabled={contacts.length === 1}
                      onClick={() =>
                        setContacts((current) =>
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
                Plantillas para tareas futuras
              </legend>
              <div className="mt-2 grid max-h-44 gap-2 overflow-auto">
                {state.checklistTemplates
                  .filter((template) => template.isActive)
                  .map((template) => {
                    const checked = selectedTemplateIds.includes(template.id);
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
                            setSelectedTemplateIds((current) =>
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
              <button
                disabled={saving}
                className="rounded-xl bg-[linear-gradient(180deg,#1f83cc_0%,#0f6cb4_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
