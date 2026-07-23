import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerAnonClient, getSupabaseServerServiceClient } from "@/lib/supabase-server";
import type { UserRole } from "@/lib/types";
import { parseBearerToken } from "@/server/auth/bearer-token";

type RequesterProfile = {
  id: string;
  role: UserRole;
  group_id: string | null;
  leader_id: string | null;
};

type ClientRow = {
  id: string;
  name: string;
  member_id: string;
  is_active: boolean;
};

type MemberProfileRow = {
  id: string;
  role: UserRole;
  group_id: string | null;
  leader_id: string | null;
};

type ContactRow = {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  notes: string | null;
  created_at: string;
};

type DocumentRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  original_file_name: string;
  stored_file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  public_token: string;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  document_id: string;
  contact_id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  subject: string | null;
  message_body: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  external_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  documents?: { title: string } | { title: string }[] | null;
  contacts?: { name: string } | { name: string }[] | null;
};

type DeliveryChannel = "EMAIL" | "WHATSAPP";
type DeliveryStatus = "PENDING" | "SENT" | "FAILED";

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const DEFAULT_STORAGE_DIR = "storage/documents";
const VALID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE = /^\+[1-9]\d{7,14}$/;

const canAssignMember = (requester: RequesterProfile, target: MemberProfileRow): boolean => {
  if (requester.role === "ADMIN") {
    return true;
  }
  if (requester.role === "MEMBER") {
    return requester.id === target.id;
  }
  if (requester.role === "LEADER") {
    if (target.leader_id === requester.id) {
      return true;
    }
    return requester.group_id !== null && target.group_id === requester.group_id;
  }
  return false;
};

const isValidUuid = (value: string): boolean => VALID_UUID.test(value);

const sanitizeFileSegment = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60) || "documento";

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeOptionalEmail = (value: unknown): string | null => {
  const normalized = normalizeOptionalText(value)?.toLowerCase() ?? null;
  if (!normalized) {
    return null;
  }
  if (!VALID_EMAIL.test(normalized)) {
    throw new HttpError(400, "Email invalido.");
  }
  return normalized;
};

const normalizeOptionalWhatsApp = (value: unknown): string | null => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  let candidate = digits;
  if (candidate.length === 10) {
    candidate = `521${candidate}`;
  } else if (candidate.length === 12 && candidate.startsWith("52")) {
    candidate = `521${candidate.slice(2)}`;
  } else if (candidate.length === 13 && candidate.startsWith("521")) {
    candidate = candidate;
  } else {
    throw new HttpError(400, "WhatsApp invalido.");
  }

  const formatted = `+${candidate}`;
  if (!VALID_PHONE.test(formatted)) {
    throw new HttpError(400, "WhatsApp invalido.");
  }

  return formatted;
};

const getStorageDir = (): string => {
  const configured = process.env.DOCUMENTS_STORAGE_DIR?.trim() || DEFAULT_STORAGE_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
};

const buildPublicDocumentUrl = (publicToken: string): string => {
  const baseUrl = process.env.PUBLIC_BASE_URL?.trim();
  if (!baseUrl) {
    throw new HttpError(
      500,
      "Falta PUBLIC_BASE_URL para exponer archivos publicos y enviarlos por WhatsApp o correo.",
    );
  }

  return new URL(`/api/documents/file/${publicToken}`, baseUrl).toString();
};

const serializeContact = (row: ContactRow) => ({
  id: row.id,
  clientId: row.client_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  whatsappPhone: row.whatsapp_phone,
  notes: row.notes,
  createdAt: row.created_at,
});

const serializeDocument = (row: DocumentRow) => ({
  id: row.id,
  clientId: row.client_id,
  title: row.title,
  description: row.description,
  originalFileName: row.original_file_name,
  storedFileName: row.stored_file_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  publicToken: row.public_token,
  publicUrl: process.env.PUBLIC_BASE_URL?.trim()
    ? new URL(`/api/documents/file/${row.public_token}`, process.env.PUBLIC_BASE_URL).toString()
    : null,
  createdAt: row.created_at,
});

const serializeDelivery = (row: DeliveryRow) => {
  const documentRelation = Array.isArray(row.documents) ? row.documents[0] : row.documents;
  const contactRelation = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;

  return {
    id: row.id,
    documentId: row.document_id,
    contactId: row.contact_id,
    documentTitle: documentRelation?.title ?? "Documento",
    contactName: contactRelation?.name ?? "Contacto",
    channel: row.channel,
    status: row.status,
    subject: row.subject,
    messageBody: row.message_body,
    recipientEmail: row.recipient_email,
    recipientPhone: row.recipient_phone,
    externalMessageId: row.external_message_id,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
};

async function withErrorHandling(
  action: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getRequesterContext(request: NextRequest): Promise<{
  adminClient: ReturnType<typeof getSupabaseServerServiceClient>;
  requester: RequesterProfile;
}> {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    throw new HttpError(401, "No autenticado.");
  }

  const anonClient = getSupabaseServerAnonClient();
  const authRes = await anonClient.auth.getUser(token);
  if (authRes.error || !authRes.data.user) {
    throw new HttpError(401, "Sesion invalida.");
  }

  const adminClient = getSupabaseServerServiceClient();
  const requesterRes = await adminClient
    .from("profiles")
    .select("id,role,group_id,leader_id")
    .eq("id", authRes.data.user.id)
    .maybeSingle();

  if (requesterRes.error || !requesterRes.data) {
    throw new HttpError(403, "Perfil del usuario activo no encontrado.");
  }

  return {
    adminClient,
    requester: requesterRes.data as RequesterProfile,
  };
}

async function assertClientScope(
  adminClient: ReturnType<typeof getSupabaseServerServiceClient>,
  requester: RequesterProfile,
  clientId: string,
  requireManage: boolean,
): Promise<ClientRow> {
  if (!isValidUuid(clientId)) {
    throw new HttpError(400, "Empresa invalida.");
  }

  const clientRes = await adminClient
    .from("clients")
    .select("id,name,member_id,is_active")
    .eq("id", clientId)
    .maybeSingle();

  if (clientRes.error || !clientRes.data) {
    throw new HttpError(404, "Empresa no encontrada.");
  }

  const client = clientRes.data as ClientRow;
  const memberRes = await adminClient
    .from("profiles")
    .select("id,role,group_id,leader_id")
    .eq("id", client.member_id)
    .maybeSingle();

  if (memberRes.error || !memberRes.data) {
    throw new HttpError(404, "Responsable de la empresa no encontrado.");
  }

  const allowed = canAssignMember(requester, memberRes.data as MemberProfileRow);
  if (!allowed) {
    throw new HttpError(
      requireManage ? 403 : 404,
      requireManage ? "Sin permisos para modificar esta empresa." : "Empresa no accesible.",
    );
  }

  return client;
}

async function assertPdfFile(file: File): Promise<Buffer> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new HttpError(400, "Solo se permiten archivos PDF.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length <= 0) {
    throw new HttpError(400, "El PDF esta vacio.");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new HttpError(400, "El PDF excede el limite de 10 MB para esta demo.");
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new HttpError(400, "El archivo no parece ser un PDF valido.");
  }
  return buffer;
}

async function saveLocalDocumentFile(params: {
  clientId: string;
  storedFileName: string;
  buffer: Buffer;
}): Promise<string> {
  const storageDir = getStorageDir();
  const clientDir = path.join(storageDir, params.clientId);
  await mkdir(clientDir, { recursive: true });
  const absolutePath = path.join(clientDir, params.storedFileName);
  await writeFile(absolutePath, params.buffer);
  return path.relative(storageDir, absolutePath);
}

async function getDocumentForManage(
  adminClient: ReturnType<typeof getSupabaseServerServiceClient>,
  requester: RequesterProfile,
  documentId: string,
): Promise<DocumentRow> {
  if (!isValidUuid(documentId)) {
    throw new HttpError(400, "Documento invalido.");
  }

  const documentRes = await adminClient
    .from("documents")
    .select(
      "id,client_id,title,description,original_file_name,stored_file_name,mime_type,size_bytes,storage_path,public_token,created_at",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (documentRes.error || !documentRes.data) {
    throw new HttpError(404, "Documento no encontrado.");
  }

  const document = documentRes.data as DocumentRow;
  await assertClientScope(adminClient, requester, document.client_id, true);
  return document;
}

async function deleteLocalDocumentFile(storagePath: string): Promise<void> {
  const absolutePath = path.join(getStorageDir(), storagePath);
  await unlink(absolutePath).catch(() => undefined);
}

async function sendWhatsAppDocument(params: {
  to: string;
  message: string;
  mediaUrl: string;
}): Promise<{ sid: string | null; status: string | null }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!accountSid || !authToken || !from) {
    throw new HttpError(
      500,
      "Faltan credenciales de Twilio WhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM.",
    );
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: params.to.startsWith("whatsapp:") ? params.to : `whatsapp:${params.to}`,
    MediaUrl: params.mediaUrl,
  });

  if (params.message.trim()) {
    body.append("Body", params.message.trim());
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new HttpError(
      502,
      `Twilio rechazo el envio: ${
        typeof payload.message === "string" ? payload.message : "error desconocido"
      }`,
    );
  }

  return {
    sid: typeof payload.sid === "string" ? payload.sid : null,
    status: typeof payload.status === "string" ? payload.status : null,
  };
}

async function sendEmailDocument(params: {
  to: string;
  subject: string;
  message: string;
  publicUrl: string;
  fileName: string;
  fileBuffer: Buffer;
}): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new HttpError(500, "Faltan RESEND_API_KEY o MAIL_FROM para envio por correo.");
  }

  const text =
    `${params.message.trim()}\n\n` +
    `Descarga directa: ${params.publicUrl}\n`;

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">` +
    `<p>${escapeHtml(params.message.trim()).replace(/\n/g, "<br />")}</p>` +
    `<p><a href="${params.publicUrl}">Descargar documento</a></p>` +
    `</div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text,
      html,
      attachments: [
        {
          filename: params.fileName,
          content: params.fileBuffer.toString("base64"),
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new HttpError(
      502,
      `El proveedor de correo rechazo el envio: ${
        typeof payload.message === "string" ? payload.message : "error desconocido"
      }`,
    );
  }

  return {
    id: typeof payload.id === "string" ? payload.id : null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function handleContactsGet(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const clientId = request.nextUrl.searchParams.get("clientId") ?? "";
    await assertClientScope(adminClient, requester, clientId, false);

    const contactsRes = await adminClient
      .from("contacts")
      .select("id,client_id,name,email,phone,whatsapp_phone,notes,created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (contactsRes.error) {
      throw new HttpError(500, `No se pudieron cargar contactos: ${contactsRes.error.message}`);
    }

    return NextResponse.json({
      contacts: (contactsRes.data ?? []).map((row) => serializeContact(row as ContactRow)),
    });
  });
}

export async function handleDeliveriesGet(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const clientId = request.nextUrl.searchParams.get("clientId") ?? "";
    await assertClientScope(adminClient, requester, clientId, false);

    const deliveriesRes = await adminClient
      .from("document_deliveries")
      .select(
        "id,document_id,contact_id,channel,status,subject,message_body,recipient_email,recipient_phone,external_message_id,error_message,sent_at,created_at,documents!inner(title,client_id),contacts(name)",
      )
      .eq("documents.client_id", clientId)
      .order("created_at", { ascending: false });

    if (deliveriesRes.error) {
      throw new HttpError(500, `No se pudieron cargar envios: ${deliveriesRes.error.message}`);
    }

    return NextResponse.json({
      deliveries: (deliveriesRes.data ?? []).map((row) => serializeDelivery(row as DeliveryRow)),
    });
  });
}

export async function handleContactsPost(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const body = (await request.json()) as Record<string, unknown>;
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    await assertClientScope(adminClient, requester, clientId, true);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw new HttpError(400, "Nombre del contacto requerido.");
    }

    const email = normalizeOptionalEmail(body.email);
    const whatsappPhone = normalizeOptionalWhatsApp(body.whatsappPhone);
    const notes = normalizeOptionalText(body.notes);

    if (!email && !whatsappPhone) {
      throw new HttpError(400, "Agrega al menos email o WhatsApp.");
    }

    const insertRes = await adminClient
      .from("contacts")
      .insert({
        client_id: clientId,
        name,
        email,
        phone: null,
        whatsapp_phone: whatsappPhone,
        notes,
        created_by: requester.id,
      })
      .select("id,client_id,name,email,phone,whatsapp_phone,notes,created_at")
      .single();

    if (insertRes.error || !insertRes.data) {
      throw new HttpError(500, `No se pudo crear contacto: ${insertRes.error?.message ?? "Error desconocido"}`);
    }

    return NextResponse.json({ contact: serializeContact(insertRes.data as ContactRow) }, { status: 201 });
  });
}

export async function handleContactsDelete(
  request: NextRequest,
  contactId: string,
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    if (!isValidUuid(contactId)) {
      throw new HttpError(400, "Contacto invalido.");
    }

    const contactRes = await adminClient
      .from("contacts")
      .select("id,client_id")
      .eq("id", contactId)
      .maybeSingle();

    if (contactRes.error || !contactRes.data) {
      throw new HttpError(404, "Contacto no encontrado.");
    }

    await assertClientScope(
      adminClient,
      requester,
      (contactRes.data as { client_id: string }).client_id,
      true,
    );

    const deleteRes = await adminClient.from("contacts").delete().eq("id", contactId);
    if (deleteRes.error) {
      throw new HttpError(500, `No se pudo eliminar contacto: ${deleteRes.error.message}`);
    }

    return NextResponse.json({ ok: true });
  });
}

export async function handleDocumentsGet(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const clientId = request.nextUrl.searchParams.get("clientId") ?? "";
    await assertClientScope(adminClient, requester, clientId, false);

    const documentsRes = await adminClient
      .from("documents")
      .select(
        "id,client_id,title,description,original_file_name,stored_file_name,mime_type,size_bytes,storage_path,public_token,created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (documentsRes.error) {
      throw new HttpError(500, `No se pudieron cargar documentos: ${documentsRes.error.message}`);
    }

    return NextResponse.json({
      documents: (documentsRes.data ?? []).map((row) => serializeDocument(row as DocumentRow)),
    });
  });
}

export async function handleDocumentsPost(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const formData = await request.formData();
    const clientIdValue = formData.get("clientId");
    const titleValue = formData.get("title");
    const descriptionValue = formData.get("description");
    const fileValue = formData.get("file");

    const clientId = typeof clientIdValue === "string" ? clientIdValue : "";
    await assertClientScope(adminClient, requester, clientId, true);

    if (!(fileValue instanceof File)) {
      throw new HttpError(400, 'El archivo PDF es requerido en el campo "file".');
    }

    const fileBuffer = await assertPdfFile(fileValue);
    const title =
      (typeof titleValue === "string" ? titleValue.trim() : "") ||
      fileValue.name.replace(/\.pdf$/i, "").trim();
    if (!title) {
      throw new HttpError(400, "Titulo requerido.");
    }

    const description =
      typeof descriptionValue === "string" ? descriptionValue.trim() || null : null;
    const documentId = randomUUID();
    const publicToken = randomUUID();
    const storedFileName = `${documentId}-${sanitizeFileSegment(fileValue.name.replace(/\.pdf$/i, ""))}.pdf`;

    const storagePath = await saveLocalDocumentFile({
      clientId,
      storedFileName,
      buffer: fileBuffer,
    });

    const insertRes = await adminClient
      .from("documents")
      .insert({
        id: documentId,
        client_id: clientId,
        title,
        description,
        original_file_name: fileValue.name,
        stored_file_name: storedFileName,
        mime_type: fileValue.type || "application/pdf",
        size_bytes: fileBuffer.byteLength,
        storage_disk: "local",
        storage_path: storagePath,
        public_token: publicToken,
        created_by: requester.id,
      })
      .select(
        "id,client_id,title,description,original_file_name,stored_file_name,mime_type,size_bytes,storage_path,public_token,created_at",
      )
      .single();

    if (insertRes.error || !insertRes.data) {
      await deleteLocalDocumentFile(storagePath);
      throw new HttpError(500, `No se pudo registrar documento: ${insertRes.error?.message ?? "Error desconocido"}`);
    }

    return NextResponse.json({ document: serializeDocument(insertRes.data as DocumentRow) }, { status: 201 });
  });
}

export async function handleDocumentsDelete(
  request: NextRequest,
  documentId: string,
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const document = await getDocumentForManage(adminClient, requester, documentId);

    const deleteRes = await adminClient.from("documents").delete().eq("id", documentId);
    if (deleteRes.error) {
      throw new HttpError(500, `No se pudo eliminar documento: ${deleteRes.error.message}`);
    }

    await deleteLocalDocumentFile(document.storage_path);
    return NextResponse.json({ ok: true });
  });
}

export async function handleDocumentsPatch(
  request: NextRequest,
  documentId: string,
): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const currentDocument = await getDocumentForManage(adminClient, requester, documentId);
    const formData = await request.formData();

    const titleValue = formData.get("title");
    const descriptionValue = formData.get("description");
    const fileValue = formData.get("file");

    const nextTitle =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : currentDocument.title;
    const nextDescription =
      typeof descriptionValue === "string"
        ? descriptionValue.trim() || null
        : currentDocument.description;

    let nextOriginalFileName = currentDocument.original_file_name;
    let nextStoredFileName = currentDocument.stored_file_name;
    let nextMimeType = currentDocument.mime_type;
    let nextSizeBytes = currentDocument.size_bytes;
    let nextStoragePath = currentDocument.storage_path;
    let replacedOldStoragePath: string | null = null;

    if (fileValue instanceof File && fileValue.size > 0) {
      const fileBuffer = await assertPdfFile(fileValue);
      const storedFileName = `${documentId}-${sanitizeFileSegment(fileValue.name.replace(/\.pdf$/i, ""))}.pdf`;
      const storagePath = await saveLocalDocumentFile({
        clientId: currentDocument.client_id,
        storedFileName,
        buffer: fileBuffer,
      });

      nextOriginalFileName = fileValue.name;
      nextStoredFileName = storedFileName;
      nextMimeType = fileValue.type || "application/pdf";
      nextSizeBytes = fileBuffer.byteLength;
      nextStoragePath = storagePath;
      replacedOldStoragePath = currentDocument.storage_path;
    }

    const updateRes = await adminClient
      .from("documents")
      .update({
        title: nextTitle,
        description: nextDescription,
        original_file_name: nextOriginalFileName,
        stored_file_name: nextStoredFileName,
        mime_type: nextMimeType,
        size_bytes: nextSizeBytes,
        storage_path: nextStoragePath,
      })
      .eq("id", documentId)
      .select(
        "id,client_id,title,description,original_file_name,stored_file_name,mime_type,size_bytes,storage_path,public_token,created_at",
      )
      .single();

    if (updateRes.error || !updateRes.data) {
      if (replacedOldStoragePath && nextStoragePath !== currentDocument.storage_path) {
        await deleteLocalDocumentFile(nextStoragePath);
      }
      throw new HttpError(500, `No se pudo actualizar documento: ${updateRes.error?.message ?? "Error desconocido"}`);
    }

    if (replacedOldStoragePath && replacedOldStoragePath !== nextStoragePath) {
      await deleteLocalDocumentFile(replacedOldStoragePath);
    }

    return NextResponse.json({ document: serializeDocument(updateRes.data as DocumentRow) });
  });
}

export async function handlePublicDocumentGet(publicToken: string): Promise<NextResponse> {
  return withErrorHandling(async () => {
    if (!isValidUuid(publicToken)) {
      throw new HttpError(400, "Token de documento invalido.");
    }

    const adminClient = getSupabaseServerServiceClient();
    const documentRes = await adminClient
      .from("documents")
      .select("original_file_name,mime_type,storage_path")
      .eq("public_token", publicToken)
      .maybeSingle();

    if (documentRes.error || !documentRes.data) {
      throw new HttpError(404, "Documento no encontrado.");
    }

    const document = documentRes.data as {
      original_file_name: string;
      mime_type: string;
      storage_path: string;
    };

    const buffer = await readFile(path.join(getStorageDir(), document.storage_path)).catch(() => null);
    if (!buffer) {
      throw new HttpError(404, "Archivo no encontrado en storage local.");
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": document.mime_type || "application/pdf",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `inline; filename="${sanitizeFileSegment(document.original_file_name)}.pdf"`,
        "Cache-Control": "public, max-age=60",
      },
    });
  });
}

export async function handleSendDocumentPost(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async () => {
    const { adminClient, requester } = await getRequesterContext(request);
    const body = (await request.json()) as Record<string, unknown>;
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    const contactId = typeof body.contactId === "string" ? body.contactId : "";
    const channels =
      Array.isArray(body.channels) && body.channels.every((item) => item === "EMAIL" || item === "WHATSAPP")
        ? (body.channels as DeliveryChannel[])
        : [];

    if (!isValidUuid(documentId)) {
      throw new HttpError(400, "Documento invalido.");
    }
    if (!isValidUuid(contactId)) {
      throw new HttpError(400, "Contacto invalido.");
    }
    if (!channels.length) {
      throw new HttpError(400, "Selecciona al menos un canal de envio.");
    }

    const documentRes = await adminClient
      .from("documents")
      .select(
        "id,client_id,title,description,original_file_name,stored_file_name,mime_type,size_bytes,storage_path,public_token,created_at",
      )
      .eq("id", documentId)
      .maybeSingle();
    if (documentRes.error || !documentRes.data) {
      throw new HttpError(404, "Documento no encontrado.");
    }

    const document = documentRes.data as DocumentRow;
    await assertClientScope(adminClient, requester, document.client_id, true);

    const contactRes = await adminClient
      .from("contacts")
      .select("id,client_id,name,email,phone,whatsapp_phone,notes,created_at")
      .eq("id", contactId)
      .maybeSingle();
    if (contactRes.error || !contactRes.data) {
      throw new HttpError(404, "Contacto no encontrado.");
    }

    const contact = contactRes.data as ContactRow;
    if (contact.client_id !== document.client_id) {
      throw new HttpError(400, "El contacto no pertenece a la misma empresa que el documento.");
    }

    const customSubject = normalizeOptionalText(body.subject);
    const customMessage = normalizeOptionalText(body.message);
    const subject = customSubject ?? `Documento: ${document.title}`;
    const message =
      customMessage ??
      `Hola ${contact.name}, te compartimos el documento "${document.title}".`;

    const publicUrl = buildPublicDocumentUrl(document.public_token);
    const fileBuffer = await readFile(path.join(getStorageDir(), document.storage_path)).catch(() => null);
    if (!fileBuffer) {
      throw new HttpError(404, "El archivo ya no existe en storage local.");
    }

    const results: Array<{
      channel: DeliveryChannel;
      status: DeliveryStatus;
      externalMessageId: string | null;
      error: string | null;
    }> = [];

    for (const channel of channels) {
      try {
        if (channel === "WHATSAPP") {
          const destination = contact.whatsapp_phone ?? contact.phone;
          if (!destination) {
            throw new HttpError(400, "El contacto no tiene numero para WhatsApp.");
          }
          const sendRes = await sendWhatsAppDocument({
            to: destination,
            message,
            mediaUrl: publicUrl,
          });
          results.push({
            channel,
            status: "SENT",
            externalMessageId: sendRes.sid,
            error: null,
          });
        } else {
          if (!contact.email) {
            throw new HttpError(400, "El contacto no tiene email.");
          }
          const sendRes = await sendEmailDocument({
            to: contact.email,
            subject,
            message,
            publicUrl,
            fileName: document.original_file_name,
            fileBuffer,
          });
          results.push({
            channel,
            status: "SENT",
            externalMessageId: sendRes.id,
            error: null,
          });
        }
      } catch (error) {
        results.push({
          channel,
          status: "FAILED",
          externalMessageId: null,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    const deliveryRows = results.map((result) => ({
      document_id: document.id,
      contact_id: contact.id,
      channel: result.channel,
      status: result.status,
      subject: result.channel === "EMAIL" ? subject : null,
      message_body: message,
      recipient_email: result.channel === "EMAIL" ? contact.email : null,
      recipient_phone:
        result.channel === "WHATSAPP" ? contact.whatsapp_phone ?? contact.phone : null,
      external_message_id: result.externalMessageId,
      error_message: result.error,
      sent_by: requester.id,
      sent_at: result.status === "SENT" ? new Date().toISOString() : null,
    }));

    const insertRes = await adminClient.from("document_deliveries").insert(deliveryRows);
    if (insertRes.error) {
      throw new HttpError(500, `No se pudo registrar historial de envios: ${insertRes.error.message}`);
    }

    const failed = results.filter((item) => item.status === "FAILED");
    return NextResponse.json(
      {
        results,
        success: failed.length === 0,
      },
      { status: failed.length === results.length ? 502 : 200 },
    );
  });
}

export async function clearLocalDocumentsStorage(): Promise<void> {
  await rm(getStorageDir(), { recursive: true, force: true });
}
