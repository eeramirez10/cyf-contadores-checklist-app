import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { document_channel } from '@prisma/client';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { DocumentsService } from './documents.service';

type UserRequest = Request & { user: { id: string; role: string } };
type UploadedPdf = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

class ClientQueryDto {
  @IsUUID()
  clientId: string;
}

class CreateContactDto {
  @IsUUID()
  clientId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

class SendDocumentDto {
  @IsUUID()
  documentId: string;

  @IsUUID()
  contactId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(document_channel, { each: true })
  channels: document_channel[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}

@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('clients')
  listClients(@Req() request: UserRequest) {
    return this.documents.listClients(request.user);
  }

  @Get('contacts')
  listContacts(@Query() query: ClientQueryDto, @Req() request: UserRequest) {
    return this.documents.listContacts(request.user, query.clientId);
  }

  @Post('contacts')
  createContact(@Body() dto: CreateContactDto, @Req() request: UserRequest) {
    return this.documents.createContact(request.user, dto);
  }

  @Delete('contacts/:contactId')
  deleteContact(
    @Param('contactId') contactId: string,
    @Req() request: UserRequest,
  ) {
    return this.documents.deleteContact(request.user, contactId);
  }

  @Get()
  listDocuments(@Query() query: ClientQueryDto, @Req() request: UserRequest) {
    return this.documents.listDocuments(request.user, query.clientId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  createDocument(
    @UploadedFile() file: UploadedPdf | undefined,
    @Body('clientId') clientId: string,
    @Body('title') title: string | undefined,
    @Body('description') description: string | undefined,
    @Req() request: UserRequest,
  ) {
    return this.documents.createDocument(
      request.user,
      clientId,
      title,
      description,
      file,
    );
  }

  @Patch(':documentId')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  updateDocument(
    @Param('documentId') documentId: string,
    @UploadedFile() file: UploadedPdf | undefined,
    @Body('title') title: string | undefined,
    @Body('description') description: string | undefined,
    @Req() request: UserRequest,
  ) {
    return this.documents.updateDocument(
      request.user,
      documentId,
      title,
      description,
      file,
    );
  }

  @Delete(':documentId')
  deleteDocument(
    @Param('documentId') documentId: string,
    @Req() request: UserRequest,
  ) {
    return this.documents.deleteDocument(request.user, documentId);
  }

  @Public()
  @Get('file/:publicToken')
  async publicFile(
    @Param('publicToken') publicToken: string,
    @Res() response: Response,
  ) {
    const file = await this.documents.publicFile(publicToken);
    response.set({
      'Cache-Control': 'public, max-age=60',
      'Content-Disposition': `inline; filename="${file.original_file_name}"`,
      'Content-Length': String(file.buffer.byteLength),
      'Content-Type': file.mime_type || 'application/pdf',
    });
    response.send(file.buffer);
  }

  @Get('deliveries')
  listDeliveries(@Query() query: ClientQueryDto, @Req() request: UserRequest) {
    return this.documents.listDeliveries(request.user, query.clientId);
  }

  @Post('deliveries/send')
  sendDocument(@Body() dto: SendDocumentDto, @Req() request: UserRequest) {
    return this.documents.sendDocument(request.user, dto);
  }
}
