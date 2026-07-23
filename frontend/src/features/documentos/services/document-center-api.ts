import type {
  ContactRecord,
  DeliveryRecord,
  DeliveryResult,
  DocumentRecord,
} from "@/features/documentos/types/document-center";

type ApiError = {
  error?: string;
};

export const fetchContacts = async (
  accessToken: string,
  clientId: string,
): Promise<ContactRecord[]> => {
  const response = await fetch(`/api/contacts?clientId=${encodeURIComponent(clientId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    contacts?: ContactRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudieron cargar contactos.");
  }

  return payload.contacts ?? [];
};

export const createContact = async (
  accessToken: string,
  payload: {
    clientId: string;
    name: string;
    email: string;
    whatsappPhone: string;
    notes: string;
  },
): Promise<ContactRecord> => {
  const response = await fetch("/api/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    contact?: ContactRecord;
    error?: string;
  };

  if (!response.ok || !body.contact) {
    throw new Error(body.error ?? "No se pudo crear contacto.");
  }

  return body.contact;
};

export const fetchDeliveries = async (
  accessToken: string,
  clientId: string,
): Promise<DeliveryRecord[]> => {
  const response = await fetch(
    `/api/document-deliveries/send?clientId=${encodeURIComponent(clientId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    deliveries?: DeliveryRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudieron cargar envios.");
  }

  return payload.deliveries ?? [];
};

export const deleteContact = async (
  accessToken: string,
  contactId: string,
): Promise<void> => {
  const response = await fetch(`/api/contacts/${contactId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(payload.error ?? "No se pudo eliminar contacto.");
  }
};

export const fetchDocuments = async (
  accessToken: string,
  clientId: string,
): Promise<DocumentRecord[]> => {
  const response = await fetch(`/api/documents?clientId=${encodeURIComponent(clientId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    documents?: DocumentRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudieron cargar documentos.");
  }

  return payload.documents ?? [];
};

export const uploadDocument = async (
  accessToken: string,
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

  const response = await fetch("/api/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const body = (await response.json().catch(() => ({}))) as {
    document?: DocumentRecord;
    error?: string;
  };

  if (!response.ok || !body.document) {
    throw new Error(body.error ?? "No se pudo subir documento.");
  }

  return body.document;
};

export const deleteDocument = async (
  accessToken: string,
  documentId: string,
): Promise<void> => {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(payload.error ?? "No se pudo eliminar documento.");
  }
};

export const updateDocument = async (
  accessToken: string,
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

  const response = await fetch(`/api/documents/${payload.documentId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const body = (await response.json().catch(() => ({}))) as {
    document?: DocumentRecord;
    error?: string;
  };

  if (!response.ok || !body.document) {
    throw new Error(body.error ?? "No se pudo actualizar documento.");
  }

  return body.document;
};

export const sendDocument = async (
  accessToken: string,
  payload: {
    documentId: string;
    contactId: string;
    channels: Array<"EMAIL" | "WHATSAPP">;
    subject: string;
    message: string;
  },
): Promise<{ success: boolean; results: DeliveryResult[] }> => {
  const response = await fetch("/api/document-deliveries/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    results?: DeliveryResult[];
    error?: string;
  };

  if (!response.ok && !body.results) {
    throw new Error(body.error ?? "No se pudo enviar documento.");
  }

  return {
    success: body.success ?? false,
    results: body.results ?? [],
  };
};
