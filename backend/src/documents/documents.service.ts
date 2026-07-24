import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  document_channel,
  document_delivery_status,
  type contacts,
  type documents,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  PermissionsService,
  type RequestActor,
} from '../permissions/permissions.service';

type UploadedPdf = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type CreateContactInput = {
  clientId: string;
  name: string;
  email?: string;
  whatsappPhone?: string;
  notes?: string;
};

type SendDocumentInput = {
  documentId: string;
  contactId: string;
  channels: document_channel[];
  subject?: string;
  message?: string;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{7,14}$/;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async listClients(actor: RequestActor) {
    const memberIds = await this.permissions.visibleMemberIds(actor);
    return this.prisma.clients.findMany({
      where:
        memberIds === null
          ? { is_active: true }
          : { is_active: true, member_id: { in: memberIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listContacts(actor: RequestActor, clientId: string) {
    await this.permissions.canAccessClient(actor, clientId);
    const contacts = await this.prisma.contacts.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: 'desc' },
    });
    return {
      contacts: contacts.map((contact) => this.serializeContact(contact)),
    };
  }

  async createContact(actor: RequestActor, input: CreateContactInput) {
    await this.permissions.canAccessClient(actor, input.clientId);
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Nombre del contacto requerido');
    }
    const email = this.normalizeEmail(input.email);
    const whatsappPhone = this.normalizeWhatsApp(input.whatsappPhone);
    if (!email && !whatsappPhone) {
      throw new BadRequestException('Agrega al menos email o WhatsApp');
    }

    const contact = await this.prisma.contacts.create({
      data: {
        client_id: input.clientId,
        name,
        email,
        whatsapp_phone: whatsappPhone,
        notes: this.optionalText(input.notes),
        created_by: actor.id,
      },
    });
    return { contact: this.serializeContact(contact) };
  }

  async deleteContact(actor: RequestActor, contactId: string) {
    const contact = await this.prisma.contacts.findUnique({
      where: { id: contactId },
      select: { client_id: true },
    });
    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
    await this.permissions.canAccessClient(actor, contact.client_id);
    await this.prisma.contacts.delete({ where: { id: contactId } });
    return { ok: true };
  }

  async listDocuments(actor: RequestActor, clientId: string) {
    await this.permissions.canAccessClient(actor, clientId);
    const documents = await this.prisma.documents.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: 'desc' },
    });
    return {
      documents: documents.map((document) => this.serializeDocument(document)),
    };
  }

  async createDocument(
    actor: RequestActor,
    clientId: string,
    title: string | undefined,
    description: string | undefined,
    file: UploadedPdf | undefined,
  ) {
    await this.permissions.canAccessClient(actor, clientId);
    const uploadedFile = this.assertPdf(file);
    const buffer = uploadedFile.buffer;
    const documentId = randomUUID();
    const storedFileName = `${documentId}-${this.sanitizeFileSegment(
      uploadedFile.originalname.replace(/\.pdf$/i, ''),
    )}.pdf`;
    const storagePath = await this.saveFile(clientId, storedFileName, buffer);
    const documentTitle =
      title?.trim() || uploadedFile.originalname.replace(/\.pdf$/i, '').trim();

    try {
      const document = await this.prisma.documents.create({
        data: {
          id: documentId,
          client_id: clientId,
          title: documentTitle,
          description: this.optionalText(description),
          original_file_name: uploadedFile.originalname,
          stored_file_name: storedFileName,
          mime_type: uploadedFile.mimetype || 'application/pdf',
          size_bytes: buffer.byteLength,
          storage_disk: 'local',
          storage_path: storagePath,
          public_token: randomUUID(),
          created_by: actor.id,
        },
      });
      return { document: this.serializeDocument(document) };
    } catch (error) {
      await this.deleteFile(storagePath);
      throw error;
    }
  }

  async updateDocument(
    actor: RequestActor,
    documentId: string,
    title: string | undefined,
    description: string | undefined,
    file: UploadedPdf | undefined,
  ) {
    const current = await this.getManagedDocument(actor, documentId);
    const next = {
      title: title?.trim() || current.title,
      description:
        description === undefined
          ? current.description
          : this.optionalText(description),
      original_file_name: current.original_file_name,
      stored_file_name: current.stored_file_name,
      mime_type: current.mime_type,
      size_bytes: current.size_bytes,
      storage_path: current.storage_path,
    };
    let replacedPath: string | null = null;

    if (file?.size) {
      const uploadedFile = this.assertPdf(file);
      const buffer = uploadedFile.buffer;
      const storedFileName = `${documentId}-${this.sanitizeFileSegment(
        uploadedFile.originalname.replace(/\.pdf$/i, ''),
      )}.pdf`;
      const storagePath = await this.saveFile(
        current.client_id,
        storedFileName,
        buffer,
      );
      next.original_file_name = uploadedFile.originalname;
      next.stored_file_name = storedFileName;
      next.mime_type = uploadedFile.mimetype || 'application/pdf';
      next.size_bytes = BigInt(buffer.byteLength);
      next.storage_path = storagePath;
      replacedPath = current.storage_path;
    }

    try {
      const document = await this.prisma.documents.update({
        where: { id: documentId },
        data: next,
      });
      if (replacedPath && replacedPath !== next.storage_path) {
        await this.deleteFile(replacedPath);
      }
      return { document: this.serializeDocument(document) };
    } catch (error) {
      if (replacedPath && replacedPath !== next.storage_path) {
        await this.deleteFile(next.storage_path);
      }
      throw error;
    }
  }

  async deleteDocument(actor: RequestActor, documentId: string) {
    const document = await this.getManagedDocument(actor, documentId);
    await this.prisma.documents.delete({ where: { id: document.id } });
    await this.deleteFile(document.storage_path);
    return { ok: true };
  }

  async publicFile(publicToken: string) {
    const document = await this.prisma.documents.findUnique({
      where: { public_token: publicToken },
      select: { original_file_name: true, mime_type: true, storage_path: true },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    const buffer = await readFile(
      path.join(this.storageDir(), document.storage_path),
    ).catch(() => null);
    if (!buffer) {
      throw new NotFoundException('Archivo no encontrado en storage local');
    }
    return { buffer, ...document };
  }

  async listDeliveries(actor: RequestActor, clientId: string) {
    await this.permissions.canAccessClient(actor, clientId);
    const deliveries = await this.prisma.document_deliveries.findMany({
      where: { documents: { client_id: clientId } },
      include: {
        documents: { select: { title: true } },
        contacts: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return {
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        documentId: delivery.document_id,
        contactId: delivery.contact_id,
        documentTitle: delivery.documents.title,
        contactName: delivery.contacts.name,
        channel: delivery.channel,
        status: delivery.status,
        subject: delivery.subject,
        messageBody: delivery.message_body,
        recipientEmail: delivery.recipient_email,
        recipientPhone: delivery.recipient_phone,
        externalMessageId: delivery.external_message_id,
        errorMessage: delivery.error_message,
        sentAt: delivery.sent_at?.toISOString() ?? null,
        createdAt: delivery.created_at.toISOString(),
      })),
    };
  }

  async sendDocument(actor: RequestActor, input: SendDocumentInput) {
    const document = await this.getManagedDocument(actor, input.documentId);
    const contact = await this.prisma.contacts.findUnique({
      where: { id: input.contactId },
    });
    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
    if (contact.client_id !== document.client_id) {
      throw new BadRequestException(
        'El contacto no pertenece a la misma empresa que el documento',
      );
    }

    const subject =
      this.optionalText(input.subject) ?? `Documento: ${document.title}`;
    const message =
      this.optionalText(input.message) ??
      `Hola ${contact.name}, te compartimos el documento "${document.title}".`;
    const publicUrl = this.publicUrl(document.public_token);
    const buffer = await readFile(
      path.join(this.storageDir(), document.storage_path),
    ).catch(() => null);
    if (!buffer) {
      throw new NotFoundException('El archivo ya no existe en storage local');
    }

    const results = await Promise.all(
      input.channels.map(async (channel) => {
        try {
          const externalMessageId =
            channel === document_channel.WHATSAPP
              ? await this.sendWhatsApp(contact, message, publicUrl)
              : await this.sendEmail(
                  contact,
                  subject,
                  message,
                  publicUrl,
                  document,
                  buffer,
                );
          return {
            channel,
            status: document_delivery_status.SENT,
            externalMessageId,
            error: null,
          };
        } catch (error) {
          return {
            channel,
            status: document_delivery_status.FAILED,
            externalMessageId: null,
            error: error instanceof Error ? error.message : 'Error desconocido',
          };
        }
      }),
    );

    await this.prisma.document_deliveries.createMany({
      data: results.map((result) => ({
        document_id: document.id,
        contact_id: contact.id,
        channel: result.channel,
        status: result.status,
        subject: result.channel === document_channel.EMAIL ? subject : null,
        message_body: message,
        recipient_email:
          result.channel === document_channel.EMAIL ? contact.email : null,
        recipient_phone:
          result.channel === document_channel.WHATSAPP
            ? (contact.whatsapp_phone ?? contact.phone)
            : null,
        external_message_id: result.externalMessageId,
        error_message: result.error,
        sent_by: actor.id,
        sent_at:
          result.status === document_delivery_status.SENT ? new Date() : null,
      })),
    });
    return {
      success: results.every(
        (result) => result.status === document_delivery_status.SENT,
      ),
      results,
    };
  }

  private async getManagedDocument(actor: RequestActor, documentId: string) {
    const document = await this.prisma.documents.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    await this.permissions.canAccessClient(actor, document.client_id);
    return document;
  }

  private assertPdf(file: UploadedPdf | undefined): UploadedPdf {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException(
        'El archivo PDF es requerido en el campo file',
      );
    }
    if (file.size > MAX_PDF_BYTES || file.buffer.length > MAX_PDF_BYTES) {
      throw new BadRequestException('El PDF excede el limite de 10 MB');
    }
    if (
      file.mimetype !== 'application/pdf' &&
      !file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }
    if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new BadRequestException('El archivo no parece ser un PDF valido');
    }
    return file;
  }

  private serializeContact(contact: contacts) {
    return {
      id: contact.id,
      clientId: contact.client_id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      whatsappPhone: contact.whatsapp_phone,
      notes: contact.notes,
      createdAt: contact.created_at.toISOString(),
    };
  }

  private serializeDocument(document: documents) {
    return {
      id: document.id,
      clientId: document.client_id,
      title: document.title,
      description: document.description,
      originalFileName: document.original_file_name,
      storedFileName: document.stored_file_name,
      mimeType: document.mime_type,
      sizeBytes: Number(document.size_bytes),
      publicToken: document.public_token,
      publicUrl: process.env.PUBLIC_BASE_URL?.trim()
        ? this.publicUrl(document.public_token)
        : null,
      createdAt: document.created_at.toISOString(),
    };
  }

  private storageDir(): string {
    const configured =
      process.env.DOCUMENTS_STORAGE_DIR?.trim() || 'storage/documents';
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  private async saveFile(
    clientId: string,
    storedFileName: string,
    buffer: Buffer,
  ) {
    const storageDir = this.storageDir();
    const clientDir = path.join(storageDir, clientId);
    await mkdir(clientDir, { recursive: true });
    const absolutePath = path.join(clientDir, storedFileName);
    await writeFile(absolutePath, buffer);
    return path.relative(storageDir, absolutePath);
  }

  private async deleteFile(storagePath: string): Promise<void> {
    await unlink(path.join(this.storageDir(), storagePath)).catch(
      () => undefined,
    );
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizeEmail(value: string | undefined): string | null {
    const email = this.optionalText(value)?.toLowerCase() ?? null;
    if (email && !EMAIL.test(email)) {
      throw new BadRequestException('Email invalido');
    }
    return email;
  }

  private normalizeWhatsApp(value: string | undefined): string | null {
    const raw = this.optionalText(value);
    if (!raw) {
      return null;
    }
    const digits = raw.replace(/\D/g, '');
    const normalized =
      digits.length === 10
        ? `521${digits}`
        : digits.length === 12 && digits.startsWith('52')
          ? `521${digits.slice(2)}`
          : digits;
    const phone = `+${normalized}`;
    if (!PHONE.test(phone) || !normalized.startsWith('521')) {
      throw new BadRequestException('WhatsApp invalido');
    }
    return phone;
  }

  private sanitizeFileSegment(value: string): string {
    return (
      value
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .slice(0, 60) || 'documento'
    );
  }

  private publicUrl(publicToken: string): string {
    const baseUrl = process.env.PUBLIC_BASE_URL?.trim();
    if (!baseUrl) {
      throw new BadRequestException(
        'Falta PUBLIC_BASE_URL para compartir el documento',
      );
    }
    return new URL(`/api/v1/documents/file/${publicToken}`, baseUrl).toString();
  }

  private async sendWhatsApp(
    contact: contacts,
    message: string,
    mediaUrl: string,
  ) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
    const destination = contact.whatsapp_phone ?? contact.phone;
    if (!accountSid || !authToken || !from || !destination) {
      throw new BadRequestException(
        'Faltan credenciales de WhatsApp o telefono de contacto',
      );
    }
    const body = new URLSearchParams({
      From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      To: destination.startsWith('whatsapp:')
        ? destination
        : `whatsapp:${destination}`,
      MediaUrl: mediaUrl,
      Body: message,
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      sid?: unknown;
      message?: unknown;
    };
    if (!response.ok) {
      throw new BadRequestException(
        `Twilio rechazo el envio: ${typeof payload.message === 'string' ? payload.message : 'error desconocido'}`,
      );
    }
    return typeof payload.sid === 'string' ? payload.sid : null;
  }

  private async sendEmail(
    contact: contacts,
    subject: string,
    message: string,
    publicUrl: string,
    document: documents,
    buffer: Buffer,
  ) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.MAIL_FROM?.trim();
    if (!apiKey || !from || !contact.email) {
      throw new BadRequestException(
        'Faltan credenciales de correo o email de contacto',
      );
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [contact.email],
        subject,
        text: `${message}\n\nDescarga directa: ${publicUrl}\n`,
        attachments: [
          {
            filename: document.original_file_name,
            content: buffer.toString('base64'),
          },
        ],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      id?: unknown;
      message?: unknown;
    };
    if (!response.ok) {
      throw new BadRequestException(
        `El proveedor de correo rechazo el envio: ${typeof payload.message === 'string' ? payload.message : 'error desconocido'}`,
      );
    }
    return typeof payload.id === 'string' ? payload.id : null;
  }
}
