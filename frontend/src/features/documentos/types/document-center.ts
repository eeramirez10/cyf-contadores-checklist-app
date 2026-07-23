export type DocumentClient = {
  id: string;
  name: string;
};

export type ContactRecord = {
  id: string;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  notes: string | null;
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  publicToken: string;
  publicUrl: string | null;
  createdAt: string;
};

export type DeliveryResult = {
  channel: "EMAIL" | "WHATSAPP";
  status: "PENDING" | "SENT" | "FAILED";
  externalMessageId: string | null;
  error: string | null;
};

export type DeliveryRecord = {
  id: string;
  documentId: string;
  contactId: string;
  documentTitle: string;
  contactName: string;
  channel: "EMAIL" | "WHATSAPP";
  status: "PENDING" | "SENT" | "FAILED";
  subject: string | null;
  messageBody: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  externalMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
};
