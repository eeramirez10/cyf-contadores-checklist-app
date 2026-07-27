"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CompanyEditModal } from "@/features/empresas/components/company-edit-modal";
import { EmpresaChecklistContent } from "@/features/empresas/components/empresa-checklist-content";
import { useEmpresasDashboardState } from "@/features/empresas/hooks/use-empresas-dashboard-state";
import { fetchDocuments } from "@/features/documentos/services/document-center-api";
import type { DocumentRecord } from "@/features/documentos/types/document-center";
import { backendFetch } from "@/lib/backend-auth";
import { useIndicatorsSocket } from "@/features/indicadores/hooks/use-indicators-socket";

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

type DetailModal =
  "fiscal" | "contacts" | "documents" | "templates" | "checklist" | null;
type EmpresaDetailPageProps = { clientId: string };

function DetailModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-[#10182885] p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="mx-auto mt-[7vh] w-[min(900px,100%)] overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="display-title text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[72vh] overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}

const InfoLine = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <div className="border-b border-[var(--line)] py-3 last:border-0">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-soft)]">
      {label}
    </p>
    <p className="mt-1 text-sm text-gray-800">{value || "Sin registrar"}</p>
  </div>
);

export function EmpresaDetailPage({ clientId }: EmpresaDetailPageProps) {
  const state = useEmpresasDashboardState();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [modal, setModal] = useState<DetailModal>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadCompany = useCallback(async () => {
    try {
      const [details, docs] = await Promise.all([
        backendFetch<CompanyDetails>(`/companies/${clientId}`),
        fetchDocuments(clientId),
      ]);
      setCompany(details);
      setDocuments(docs);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la empresa.",
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);
  useEffect(() => {
    if (!state.session) return;
    const timer = window.setTimeout(() => void loadCompany(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCompany, state.session]);
  useIndicatorsSocket([clientId], state.month, () => {
    void state.loadData();
  });

  const client = state.clients.find((item) => item.id === clientId);
  const activities = state.clientActivities.filter(
    (item) =>
      item.clientId === clientId &&
      item.isActive &&
      item.scheduledMonths.includes(Number(state.month.slice(5))),
  );
  const templates = useMemo(
    () =>
      company?.checklist_template_assignments
        .map((assignment) =>
          state.checklistTemplates.find(
            (item) => item.id === assignment.checklist_template_id,
          ),
        )
        .filter((item): item is NonNullable<typeof item> => Boolean(item)) ??
      [],
    [company, state.checklistTemplates],
  );
  const address = company
    ? [
        company.address_street,
        company.address_ext_no,
        company.address_int_no,
        company.address_colony,
        company.address_postal_code,
        company.address_city,
        company.address_state,
        company.address_country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  if (state.authLoading || loading || !company)
    return (
      <article className="surface rounded-3xl p-6 text-sm text-[var(--foreground-soft)]">
        Cargando ficha de empresa...
      </article>
    );
  return (
    <section className="grid gap-5">
      <div className="relative overflow-hidden rounded-[30px] border border-[#b8d5eb] bg-[linear-gradient(135deg,#f8fcff_0%,#e8f4fc_55%,#fff8ed_100%)] p-6 shadow-[0_18px_45px_rgba(24,86,130,0.12)]">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-white/50" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link
              href="/empresas"
              className="text-xs font-medium text-[#256d9f] hover:underline"
            >
              ← Empresas
            </Link>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#38749a]">
              Expediente de empresa
            </p>
            <h1 className="display-title mt-1 text-3xl font-semibold text-[#0b315f]">
              {company.name}
            </h1>
            <p className="mt-2 text-sm text-[#42647a]">
              {company.legal_name || "Razón social pendiente"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${company.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}
            >
              {company.is_active ? "Activa" : "Inactiva"}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-xl bg-[#0b315f] px-4 py-2 text-sm font-medium text-white"
            >
              Editar empresa
            </button>
          </div>
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
            <p className="text-xs text-[#55758a]">Responsable</p>
            <p className="mt-1 font-semibold text-[#173c59]">
              {state.usersById.get(company.member_id)?.name ?? "Sin asignar"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
            <p className="text-xs text-[#55758a]">Contactos</p>
            <p className="mt-1 font-semibold text-[#173c59]">
              {company.contacts.length} registrados
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
            <p className="text-xs text-[#55758a]">Documentos</p>
            <p className="mt-1 font-semibold text-[#173c59]">
              {documents.length} archivos
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ["fiscal", "Datos fiscales", "RFC, régimen y EKEY"],
            [
              "contacts",
              "Contactos",
              `${company.contacts.length} contactos de la empresa`,
            ],
            [
              "documents",
              "Documentos",
              `${documents.length} archivos vinculados`,
            ],
            [
              "templates",
              "Plantillas",
              `${templates.length} configuraciones activas`,
            ],
            [
              "checklist",
              "Checklist del mes",
              `${activities.length} tareas programadas`,
            ],
          ] as const
        ).map(([key, title, description]) => (
          <button
            key={key}
            type="button"
            onClick={() => setModal(key)}
            className="surface group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[#7eb6dc]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4c93bd]">
              Ver detalle
            </p>
            <h2 className="display-title mt-2 text-lg font-semibold text-[#153d5d]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground-soft)]">
              {description}
            </p>
          </button>
        ))}
        <Link
          href={`/empresas/${clientId}/agenda`}
          className="rounded-2xl bg-[#0b315f] p-4 text-white transition hover:bg-[#08264b]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200">
            Historial
          </p>
          <h2 className="display-title mt-2 text-lg font-semibold">
            Agenda anual
          </h2>
          <p className="mt-1 text-sm text-blue-100">
            Avances y pendientes por mes
          </p>
        </Link>
      </div>
      {modal === "fiscal" ? (
        <DetailModalShell
          title="Datos fiscales y dirección"
          onClose={() => setModal(null)}
        >
          <InfoLine label="Razón social" value={company.legal_name} />
          <InfoLine label="RFC" value={company.rfc} />
          <InfoLine label="Régimen fiscal" value={company.tax_regime} />
          <InfoLine label="Referencia EKEY" value={company.ekey_reference} />
          <InfoLine label="Dirección" value={address} />
        </DetailModalShell>
      ) : null}
      {modal === "contacts" ? (
        <DetailModalShell title="Contactos" onClose={() => setModal(null)}>
          <div className="grid gap-3">
            {company.contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-2xl border border-[var(--line)] p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-[var(--foreground-soft)]">
                      {contact.position || "Sin cargo"}
                    </p>
                  </div>
                  {contact.is_primary ? (
                    <span className="text-xs font-medium text-[#0b6a98]">
                      Principal
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm">
                  {contact.email ||
                    contact.phone ||
                    contact.whatsapp_phone ||
                    "Sin medio registrado"}
                </p>
                {contact.notes ? (
                  <p className="mt-2 text-xs text-[var(--foreground-soft)]">
                    {contact.notes}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </DetailModalShell>
      ) : null}
      {modal === "documents" ? (
        <DetailModalShell
          title="Documentos de empresa"
          onClose={() => setModal(null)}
        >
          <div className="grid gap-2">
            {documents.length ? (
              documents.map((document) => (
                <a
                  key={document.id}
                  href={document.publicUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[var(--line)] p-3 hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-800">{document.title}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                    {document.originalFileName}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-sm text-[var(--foreground-soft)]">
                No hay documentos vinculados.
              </p>
            )}
          </div>
        </DetailModalShell>
      ) : null}
      {modal === "templates" ? (
        <DetailModalShell
          title="Plantillas asignadas"
          onClose={() => setModal(null)}
        >
          <div className="grid gap-2">
            {templates.map((template) => (
              <article
                key={template.id}
                className="rounded-xl border border-[var(--line)] p-3"
              >
                <p className="font-medium">{template.name}</p>
                <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                  {template.activityIds.length} actividades ·{" "}
                  {template.scheduledMonths.length === 12
                    ? "Mensual"
                    : `${template.scheduledMonths.length} meses`}
                </p>
              </article>
            ))}
          </div>
        </DetailModalShell>
      ) : null}
      {modal === "checklist" && client ? (
        <DetailModalShell
          title={`Checklist · ${state.month}`}
          onClose={() => setModal(null)}
        >
          <EmpresaChecklistContent
            state={state}
            client={client}
            activities={activities}
            progress={state.progressByClient.get(clientId) ?? 0}
            ventas={state.progressByClientVentas.get(clientId) ?? 0}
            produccion={state.progressByClientProduccion.get(clientId) ?? 0}
          />
        </DetailModalShell>
      ) : null}
      {editing ? (
        <CompanyEditModal
          clientId={clientId}
          state={state}
          onClose={() => {
            setEditing(false);
            void loadCompany();
          }}
        />
      ) : null}
    </section>
  );
}
