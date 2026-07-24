import type {
  ContactRecord,
  DeliveryRecord,
  DeliveryResult,
  DocumentRecord,
} from "@/features/documentos/types/document-center";
import { backendFetch } from "@/lib/backend-auth";

export const fetchContacts = async (
  clientId: string,
): Promise<ContactRecord[]> => {
  const payload = await backendFetch<{ contacts?: ContactRecord[] }>(
    `/documents/contacts?clientId=${encodeURIComponent(clientId)}`,
  );
  return payload.contacts ?? [];
};

export const createContact = async (
  payload: {
    clientId: string;
    name: string;
    email: string;
    whatsappPhone: string;
    notes: string;
  },
): Promise<ContactRecord> => {
  const body = await backendFetch<{ contact?: ContactRecord }>("/documents/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!body.contact) {
    throw new Error("No se pudo crear contacto.");
  }

  return body.contact;
};

export const fetchDeliveries = async (
  clientId: string,
): Promise<DeliveryRecord[]> => {
  const payload = await backendFetch<{ deliveries?: DeliveryRecord[] }>(
    `/documents/deliveries?clientId=${encodeURIComponent(clientId)}`,
  );
  return payload.deliveries ?? [];
};

export const deleteContact = async (
  contactId: string,
): Promise<void> => {
  await backendFetch(`/documents/contacts/${contactId}`, {
    method: "DELETE",
  });
};

export const fetchDocuments = async (
  clientId: string,
): Promise<DocumentRecord[]> => {
  const payload = await backendFetch<{ documents?: DocumentRecord[] }>(
    `/documents?clientId=${encodeURIComponent(clientId)}`,
  );
  return payload.documents ?? [];
};

export const uploadDocument = async (
  payload: {
    clientId: string;
    title: string;
    description: string;
    file: File;
  },
): Promise<DocumentRecord> => {
  const formData = new FormData();
  formData.set("clientId", payload.clientId);
  formData.set("title", payload.title);
  formData.set("description", payload.description);
  formData.set("file", payload.file);

  const body = await backendFetch<{ document?: DocumentRecord }>("/documents", {
    method: "POST",
    body: formData,
  });
  if (!body.document) {
    throw new Error("No se pudo subir documento.");
  }

  return body.document;
};

export const deleteDocument = async (
  documentId: string,
): Promise<void> => {
  await backendFetch(`/documents/${documentId}`, {
    method: "DELETE",
  });
};

export const updateDocument = async (
  payload: {
    documentId: string;
    title: string;
    description: string;
    file: File | null;
  },
): Promise<DocumentRecord> => {
  const formData = new FormData();
  formData.set("title", payload.title);
  formData.set("description", payload.description);
  if (payload.file) {
    formData.set("file", payload.file);
  }

  const body = await backendFetch<{ document?: DocumentRecord }>(
    `/documents/${payload.documentId}`,
    {
      method: "PATCH",
      body: formData,
    },
  );

  if (!body.document) {
    throw new Error("No se pudo actualizar documento.");
  }

  return body.document;
};

export const sendDocument = async (
  payload: {
    documentId: string;
    contactId: string;
    channels: Array<"EMAIL" | "WHATSAPP">;
    subject: string;
    message: string;
  },
): Promise<{ success: boolean; results: DeliveryResult[] }> => {
  const body = await backendFetch<{
    success?: boolean;
    results?: DeliveryResult[];
  }>("/documents/deliveries/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return {
    success: body.success ?? false,
    results: body.results ?? [],
  };
};
