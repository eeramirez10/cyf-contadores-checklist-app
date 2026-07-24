"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  createContact,
  deleteContact,
  deleteDocument,
  fetchContacts,
  fetchDeliveries,
  fetchDocuments,
  sendDocument,
  updateDocument,
  uploadDocument,
} from "@/features/documentos/services/document-center-api";
import type {
  ContactRecord,
  DeliveryRecord,
  DocumentClient,
  DocumentRecord,
} from "@/features/documentos/types/document-center";
import { useAuth } from "@/features/auth/components/auth-provider";
import { backendFetch } from "@/lib/backend-auth";

const formatBytes = (value: number): string => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

type ModalShellProps = {
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  onClose: () => void;
  children: React.ReactNode;
};

function ModalShell({
  title,
  subtitle,
  maxWidthClass = "max-w-2xl",
  onClose,
  children,
}: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-[#10182882] p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`mx-auto mt-[6vh] w-full rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] ${maxWidthClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="display-title text-2xl font-semibold text-gray-900">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const { status, user } = useAuth();
  const loadingSession = status === "loading";
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [loadingCenterData, setLoadingCenterData] = useState<boolean>(false);

  const [clients, setClients] = useState<DocumentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);

  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [sendDocumentTarget, setSendDocumentTarget] = useState<DocumentRecord | null>(null);
  const [previewDocumentTarget, setPreviewDocumentTarget] = useState<DocumentRecord | null>(null);
  const [editDocumentTarget, setEditDocumentTarget] = useState<DocumentRecord | null>(null);

  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactWhatsApp, setContactWhatsApp] = useState<string>("");
  const [contactNotes, setContactNotes] = useState<string>("");
  const [creatingContact, setCreatingContact] = useState<boolean>(false);

  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [documentDescription, setDocumentDescription] = useState<string>("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<boolean>(false);
  const [editingDocument, setEditingDocument] = useState<boolean>(false);
  const [editDocumentTitle, setEditDocumentTitle] = useState<string>("");
  const [editDocumentDescription, setEditDocumentDescription] = useState<string>("");
  const [editDocumentFile, setEditDocumentFile] = useState<File | null>(null);

  const [sendContactId, setSendContactId] = useState<string>("");
  const [sendByEmail, setSendByEmail] = useState<boolean>(true);
  const [sendByWhatsApp, setSendByWhatsApp] = useState<boolean>(false);
  const [sendSubject, setSendSubject] = useState<string>("");
  const [sendMessage, setSendMessage] = useState<string>("");
  const [sendingDocument, setSendingDocument] = useState<boolean>(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );
  const activeSendContactId = sendContactId || contacts[0]?.id || "";
  const selectedSendContact = useMemo(
    () => contacts.find((contact) => contact.id === activeSendContactId) ?? null,
    [activeSendContactId, contacts],
  );

  const loadCenterData = useCallback(async (clientId: string) => {
    setLoadingCenterData(true);
    try {
      const [contactsResult, documentsResult, deliveriesResult] = await Promise.allSettled([
        fetchContacts(clientId),
        fetchDocuments(clientId),
        fetchDeliveries(clientId),
      ]);

      if (contactsResult.status === "fulfilled") {
        setContacts(contactsResult.value);
      }
      if (documentsResult.status === "fulfilled") {
        setDocuments(documentsResult.value);
      }
      if (deliveriesResult.status === "fulfilled") {
        setDeliveries(deliveriesResult.value);
      }

      const errors = [contactsResult, documentsResult, deliveriesResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) =>
          result.reason instanceof Error ? result.reason.message : "No se pudo actualizar una sección.",
        );

      if (errors.length) {
        toast.warning(errors[0]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar informacion.";
      toast.error(message);
    } finally {
      setLoadingCenterData(false);
    }
  }, []);

  const selectClient = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setContacts([]);
    setDocuments([]);
    setDeliveries([]);

    if (clientId) {
      void loadCenterData(clientId);
    }
  }, [loadCenterData]);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const nextClients = await backendFetch<DocumentClient[]>("/documents/clients");
      setClients(nextClients);
      selectClient(nextClients[0]?.id ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar empresas.");
    } finally {
      setLoadingClients(false);
    }
  }, [selectClient]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const timer = window.setTimeout(() => void loadClients(), 0);
    return () => window.clearTimeout(timer);
  }, [loadClients, status]);

  useEffect(() => {
    const hasOpenModal =
      isContactModalOpen ||
      isUploadModalOpen ||
      Boolean(sendDocumentTarget) ||
      Boolean(previewDocumentTarget) ||
      Boolean(editDocumentTarget);
    if (!hasOpenModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setIsContactModalOpen(false);
      setIsUploadModalOpen(false);
      setSendDocumentTarget(null);
      setPreviewDocumentTarget(null);
      setEditDocumentTarget(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editDocumentTarget, isContactModalOpen, isUploadModalOpen, previewDocumentTarget, sendDocumentTarget]);

  const resetContactForm = () => {
    setContactName("");
    setContactEmail("");
    setContactWhatsApp("");
    setContactNotes("");
  };

  const resetUploadForm = () => {
    setDocumentTitle("");
    setDocumentDescription("");
    setDocumentFile(null);
  };

  const resetEditDocumentForm = () => {
    setEditDocumentTitle("");
    setEditDocumentDescription("");
    setEditDocumentFile(null);
  };

  const openContactModal = () => {
    resetContactForm();
    setIsContactModalOpen(true);
  };

  const openUploadModal = () => {
    resetUploadForm();
    setIsUploadModalOpen(true);
  };

  const openSendModal = (document: DocumentRecord) => {
    setSendDocumentTarget(document);
    setSendContactId(contacts[0]?.id ?? "");
    setSendByEmail(true);
    setSendByWhatsApp(false);
    setSendSubject(`Documento: ${document.title}`);
    setSendMessage(`Hola, te compartimos el documento "${document.title}".`);
  };

  const openPreviewModal = (document: DocumentRecord) => {
    setPreviewDocumentTarget(document);
  };

  const openEditDocumentModal = (document: DocumentRecord) => {
    setEditDocumentTarget(document);
    setEditDocumentTitle(document.title);
    setEditDocumentDescription(document.description ?? "");
    setEditDocumentFile(null);
  };

  const onCreateContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClientId) {
      toast.warning("Selecciona una empresa.");
      return;
    }

    setCreatingContact(true);
    try {
      const createdContact = await createContact({
        clientId: selectedClientId,
        name: contactName.trim(),
        email: contactEmail.trim(),
        whatsappPhone: contactWhatsApp.trim(),
        notes: contactNotes.trim(),
      });
      setContacts((current) => [createdContact, ...current.filter((item) => item.id !== createdContact.id)]);
      toast.success("Contacto creado.");
      setIsContactModalOpen(false);
      resetContactForm();
      void loadCenterData(selectedClientId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear contacto.";
      toast.error(message);
    } finally {
      setCreatingContact(false);
    }
  };

  const onDeleteContact = async (contact: ContactRecord) => {
    if (!window.confirm(`Eliminar contacto "${contact.name}"?`)) {
      return;
    }

    try {
      await deleteContact(contact.id);
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      setDeliveries((current) => current.filter((item) => item.contactId !== contact.id));
      toast.success("Contacto eliminado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar contacto.";
      toast.error(message);
    }
  };

  const onUploadDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClientId) {
      toast.warning("Selecciona una empresa.");
      return;
    }
    if (!documentFile) {
      toast.warning("Selecciona un PDF.");
      return;
    }

    setUploadingDocument(true);
    try {
      const createdDocument = await uploadDocument({
        clientId: selectedClientId,
        title: documentTitle.trim(),
        description: documentDescription.trim(),
        file: documentFile,
      });
      setDocuments((current) => [createdDocument, ...current.filter((item) => item.id !== createdDocument.id)]);
      toast.success("PDF subido.");
      setIsUploadModalOpen(false);
      resetUploadForm();
      void loadCenterData(selectedClientId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir documento.";
      toast.error(message);
    } finally {
      setUploadingDocument(false);
    }
  };

  const onDeleteDocument = async (document: DocumentRecord) => {
    if (!window.confirm(`Eliminar documento "${document.title}"?`)) {
      return;
    }

    try {
      await deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setDeliveries((current) => current.filter((item) => item.documentId !== document.id));
      toast.success("Documento eliminado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar documento.";
      toast.error(message);
    }
  };

  const onEditDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editDocumentTarget) {
      return;
    }

    setEditingDocument(true);
    try {
      const updatedDocument = await updateDocument({
        documentId: editDocumentTarget.id,
        title: editDocumentTitle.trim(),
        description: editDocumentDescription.trim(),
        file: editDocumentFile,
      });
      setDocuments((current) =>
        current.map((item) => (item.id === updatedDocument.id ? updatedDocument : item)),
      );
      toast.success("Documento actualizado.");
      setEditDocumentTarget(null);
      resetEditDocumentForm();
      void loadCenterData(selectedClientId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar documento.";
      toast.error(message);
    } finally {
      setEditingDocument(false);
    }
  };

  const onSendDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sendDocumentTarget) {
      return;
    }
    if (!activeSendContactId) {
      toast.warning("Selecciona un contacto.");
      return;
    }

    const channels: Array<"EMAIL" | "WHATSAPP"> = [];
    if (sendByEmail) {
      channels.push("EMAIL");
    }
    if (sendByWhatsApp) {
      channels.push("WHATSAPP");
    }
    if (!channels.length) {
      toast.warning("Selecciona al menos un canal.");
      return;
    }

    setSendingDocument(true);
    try {
      const result = await sendDocument({
        documentId: sendDocumentTarget.id,
        contactId: activeSendContactId,
        channels,
        subject: sendSubject.trim(),
        message: sendMessage.trim(),
      });

      const failedResults = result.results.filter((item) => item.status === "FAILED");
      if (!failedResults.length) {
        toast.success("Documento enviado.");
        await loadCenterData(selectedClientId);
        setSendDocumentTarget(null);
        return;
      }

      toast.warning(
        failedResults
          .map((item) => `${item.channel}: ${item.error ?? "fallo desconocido"}`)
          .join(" | "),
      );
      if (result.success) {
        await loadCenterData(selectedClientId);
        setSendDocumentTarget(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar documento.";
      toast.error(message);
    } finally {
      setSendingDocument(false);
    }
  };

  if (loadingSession) {
    return (
      <article className="surface rounded-3xl p-6 text-sm text-[var(--foreground-soft)]">
        Verificando sesion...
      </article>
    );
  }

  if (!user) {
    return (
      <article className="surface rounded-3xl p-6">
        <h2 className="display-title text-2xl font-semibold">Sin sesion</h2>
        <p className="mt-2 text-sm text-[var(--foreground-soft)]">
          Inicia sesion para administrar documentos y contactos.
        </p>
      </article>
    );
  }

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="surface rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="status-pill text-[11px] text-[var(--foreground-soft)]">
                Centro documental
              </p>
              <h2 className="display-title mt-2 text-2xl font-semibold text-gray-900">
                Documentos y envíos
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openContactModal}
                disabled={!selectedClientId}
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Nuevo contacto
              </button>
              <button
                type="button"
                onClick={openUploadModal}
                disabled={!selectedClientId}
                className="rounded-xl bg-[linear-gradient(180deg,#164e63_0%,#155e75_100%)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Subir PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                Empresa
              </span>
              <select
                value={selectedClientId}
                onChange={(event) => selectClient(event.target.value)}
                className="soft-input h-11 px-3 text-sm"
                disabled={loadingClients || !clients.length}
              >
                {clients.length ? null : <option value="">Sin empresas visibles</option>}
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">Contactos</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{contacts.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">Documentos</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{documents.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">Envios</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{deliveries.length}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-dashed border-[#99d4df] bg-[linear-gradient(135deg,#ecfeff_0%,#f8fafc_100%)] p-4">
            <p className="text-sm font-medium text-[#0f3d4a]">
              Empresa activa: {selectedClient?.name ?? "Sin seleccion"}
            </p>
          </div>
        </article>

        <article className="surface rounded-[28px] p-5">
          <h3 className="display-title text-xl font-semibold text-gray-900">Cobertura del contacto</h3>

          <div className="mt-4 grid gap-3">
            {contacts.slice(0, 3).map((contact) => (
              <div
                key={contact.id}
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                    <p className="mt-1 text-xs text-[var(--foreground-soft)]">
                      {contact.email ?? "Sin email"} · {contact.whatsappPhone ?? "Sin WhatsApp"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#b7e4ec] bg-[#ecfeff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0f596d]">
                    {contact.email && contact.whatsappPhone
                      ? "Email + WA"
                      : contact.email
                        ? "Email"
                        : contact.whatsappPhone
                          ? "WhatsApp"
                          : "Sin canal"}
                  </span>
                </div>
              </div>
            ))}

            {!contacts.length ? (
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-[var(--foreground-soft)]">
                Aun no hay contactos para esta empresa.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="surface rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="display-title text-xl font-semibold text-gray-900">Contactos</h3>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Altas por modal y baja directa.
              </p>
            </div>
            <span className="status-pill text-[11px] text-[var(--foreground-soft)]">
              {selectedClient?.name ?? "Sin empresa"}
            </span>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Notas</th>
                  <th className="px-4 py-3 text-center">Accion</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length ? (
                  contacts.map((contact) => (
                    <tr key={contact.id} className="border-t border-[var(--line)] odd:bg-white even:bg-[#fbfdff]">
                      <td className="px-4 py-3 font-medium text-gray-900">{contact.name}</td>
                      <td className="px-4 py-3 text-gray-600">{contact.email ?? "Sin email"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {contact.whatsappPhone ?? "Sin WhatsApp"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {contact.notes ? (
                          <span className="line-clamp-2">{contact.notes}</span>
                        ) : (
                          "Sin notas"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => void onDeleteContact(contact)}
                          className="rounded-lg border border-[#efc9c9] px-3 py-1.5 text-xs font-medium text-[#9f2d2d] hover:bg-[#fff5f5]"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      {loadingCenterData ? "Cargando contactos..." : "Sin contactos para esta empresa."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="surface rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="display-title text-xl font-semibold text-gray-900">Documentos</h3>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                PDFs asociados a la empresa activa.
              </p>
            </div>
            <span className="status-pill text-[11px] text-[var(--foreground-soft)]">
              {documents.length} cargados
            </span>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left">Titulo</th>
                  <th className="px-4 py-3 text-left">Archivo</th>
                  <th className="px-4 py-3 text-left">Peso</th>
                  <th className="px-4 py-3 text-left">Creado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documents.length ? (
                  documents.map((document) => (
                    <tr
                      key={document.id}
                      className="border-t border-[var(--line)] odd:bg-white even:bg-[#fbfdff]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{document.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {document.description ?? "Sin descripcion"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{document.originalFileName}</td>
                      <td className="px-4 py-3 text-gray-600">{formatBytes(document.sizeBytes)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(document.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPreviewModal(document)}
                            disabled={!document.publicUrl}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                              document.publicUrl
                                ? "border-[var(--line)] text-gray-700 hover:bg-gray-100"
                                : "cursor-not-allowed border-gray-200 text-gray-400"
                            }`}
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditDocumentModal(document)}
                            className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => openSendModal(document)}
                            className="rounded-lg bg-[linear-gradient(180deg,#1d4ed8_0%,#1e40af_100%)] px-3 py-1.5 text-xs font-medium text-white"
                          >
                            Enviar
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteDocument(document)}
                            className="rounded-lg border border-[#efc9c9] px-3 py-1.5 text-xs font-medium text-[#9f2d2d] hover:bg-[#fff5f5]"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-[var(--foreground-soft)]"
                    >
                      {loadingCenterData ? "Cargando documentos..." : "Sin PDFs para esta empresa."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-4">
        <article className="surface rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="display-title text-xl font-semibold text-gray-900">Historial de envíos</h3>
              <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                Auditoría de intentos y resultados.
              </p>
            </div>
            <span className="status-pill text-[11px] text-[var(--foreground-soft)]">
              {deliveries.length} registros
            </span>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Documento</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Canal</th>
                  <th className="px-4 py-3 text-left">Destino</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length ? (
                  deliveries.map((delivery) => (
                    <tr key={delivery.id} className="border-t border-[var(--line)] odd:bg-white even:bg-[#fbfdff]">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(delivery.sentAt ?? delivery.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{delivery.documentTitle}</td>
                      <td className="px-4 py-3 text-gray-700">{delivery.contactName}</td>
                      <td className="px-4 py-3 text-gray-700">{delivery.channel}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {delivery.recipientEmail ?? delivery.recipientPhone ?? "Sin destino"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            delivery.status === "SENT"
                              ? "border-[#b7e4c7] bg-[#eefcf2] text-[#146534]"
                              : delivery.status === "FAILED"
                                ? "border-[#f2c7c7] bg-[#fff5f5] text-[#9f2d2d]"
                                : "border-[#d6d8dd] bg-[#f6f7f9] text-[#4b5563]"
                          }`}
                        >
                          {delivery.status === "SENT"
                            ? "Enviado"
                            : delivery.status === "FAILED"
                              ? "Falló"
                              : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {delivery.errorMessage ?? delivery.externalMessageId ?? "OK"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--foreground-soft)]">
                      {loadingCenterData ? "Cargando historial..." : "Sin envíos registrados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {isContactModalOpen ? (
        <ModalShell
          title="Nuevo contacto"
          subtitle={selectedClient ? `Empresa: ${selectedClient.name}` : undefined}
          onClose={() => setIsContactModalOpen(false)}
        >
          <form onSubmit={onCreateContact} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="soft-input h-11 px-3 text-sm"
                placeholder="Nombre completo"
                required
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="soft-input h-11 px-3 text-sm"
                placeholder="correo@empresa.com"
              />
            </div>
            <input
              value={contactWhatsApp}
              onChange={(event) => setContactWhatsApp(event.target.value)}
              className="soft-input h-11 px-3 text-sm"
              placeholder="WhatsApp"
            />
            <textarea
              value={contactNotes}
              onChange={(event) => setContactNotes(event.target.value)}
              className="soft-input min-h-[120px] px-3 py-3 text-sm"
              placeholder="Notas internas del contacto"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={creatingContact}
                className="rounded-xl bg-[linear-gradient(180deg,#0f766e_0%,#115e59_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {creatingContact ? "Guardando..." : "Guardar contacto"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isUploadModalOpen ? (
        <ModalShell
          title="Subir PDF"
          subtitle={selectedClient ? `Empresa: ${selectedClient.name}` : undefined}
          onClose={() => setIsUploadModalOpen(false)}
        >
          <form onSubmit={onUploadDocument} className="grid gap-3">
            <input
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              className="soft-input h-11 px-3 text-sm"
              placeholder="Titulo del documento"
            />
            <textarea
              value={documentDescription}
              onChange={(event) => setDocumentDescription(event.target.value)}
              className="soft-input min-h-[120px] px-3 py-3 text-sm"
              placeholder="Descripcion breve"
            />
            <label className="grid gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-[#f8fbff] p-4">
              <span className="text-sm font-medium text-gray-900">Selecciona el PDF</span>
              <span className="text-xs text-[var(--foreground-soft)]">
                Maximo 10 MB, solo archivos PDF.
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {documentFile ? (
                <span className="text-xs text-[#155e75]">
                  {documentFile.name} · {formatBytes(documentFile.size)}
                </span>
              ) : null}
            </label>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={uploadingDocument}
                className="rounded-xl bg-[linear-gradient(180deg,#164e63_0%,#155e75_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {uploadingDocument ? "Subiendo..." : "Guardar PDF"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {sendDocumentTarget ? (
        <ModalShell
          title="Enviar documento"
          subtitle={`Documento: ${sendDocumentTarget.title}`}
          maxWidthClass="max-w-3xl"
          onClose={() => setSendDocumentTarget(null)}
        >
          <form onSubmit={onSendDocument} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Contacto
                </span>
                <select
                  value={activeSendContactId}
                  onChange={(event) => setSendContactId(event.target.value)}
                  className="soft-input h-11 px-3 text-sm"
                  required
                >
                  <option value="">Selecciona contacto</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-[var(--line)] bg-[#f8fafc] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Canales detectados
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  Email: {selectedSendContact?.email ?? "No"}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  WhatsApp: {selectedSendContact?.whatsappPhone ?? "No"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={sendByEmail}
                  onChange={(event) => setSendByEmail(event.target.checked)}
                />
                <span className="text-sm font-medium text-gray-800">Enviar por correo</span>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={sendByWhatsApp}
                  onChange={(event) => setSendByWhatsApp(event.target.checked)}
                />
                <span className="text-sm font-medium text-gray-800">Enviar por WhatsApp</span>
              </label>
            </div>

            <input
              value={sendSubject}
              onChange={(event) => setSendSubject(event.target.value)}
              className="soft-input h-11 px-3 text-sm"
              placeholder="Asunto del correo"
            />
            <textarea
              value={sendMessage}
              onChange={(event) => setSendMessage(event.target.value)}
              className="soft-input min-h-[140px] px-3 py-3 text-sm"
              placeholder="Mensaje para el contacto"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={sendingDocument}
                className="rounded-xl bg-[linear-gradient(180deg,#1d4ed8_0%,#1e3a8a_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {sendingDocument ? "Enviando..." : "Enviar ahora"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {previewDocumentTarget ? (
        <ModalShell
          title={previewDocumentTarget.title}
          subtitle={previewDocumentTarget.originalFileName}
          maxWidthClass="max-w-6xl"
          onClose={() => setPreviewDocumentTarget(null)}
        >
          {previewDocumentTarget.publicUrl ? (
            <iframe
              src={previewDocumentTarget.publicUrl}
              title={previewDocumentTarget.title}
              className="h-[75vh] w-full rounded-2xl border border-[var(--line)] bg-white"
            />
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-[var(--foreground-soft)]">
              No se pudo cargar la vista previa.
            </div>
          )}
        </ModalShell>
      ) : null}

      {editDocumentTarget ? (
        <ModalShell
          title="Editar documento"
          subtitle={editDocumentTarget.originalFileName}
          onClose={() => {
            setEditDocumentTarget(null);
            resetEditDocumentForm();
          }}
        >
          <form onSubmit={onEditDocument} className="grid gap-3">
            <input
              value={editDocumentTitle}
              onChange={(event) => setEditDocumentTitle(event.target.value)}
              className="soft-input h-11 px-3 text-sm"
              placeholder="Titulo del documento"
              required
            />
            <textarea
              value={editDocumentDescription}
              onChange={(event) => setEditDocumentDescription(event.target.value)}
              className="soft-input min-h-[120px] px-3 py-3 text-sm"
              placeholder="Descripcion breve"
            />
            <label className="grid gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-[#f8fbff] p-4">
              <span className="text-sm font-medium text-gray-900">Reemplazar PDF</span>
              <span className="text-xs text-[var(--foreground-soft)]">
                Opcional. Si eliges uno nuevo, reemplaza el actual.
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setEditDocumentFile(event.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {editDocumentFile ? (
                <span className="text-xs text-[#155e75]">
                  {editDocumentFile.name} · {formatBytes(editDocumentFile.size)}
                </span>
              ) : (
                <span className="text-xs text-[var(--foreground-soft)]">
                  Archivo actual: {editDocumentTarget.originalFileName}
                </span>
              )}
            </label>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={editingDocument}
                className="rounded-xl bg-[linear-gradient(180deg,#164e63_0%,#155e75_100%)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {editingDocument ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
