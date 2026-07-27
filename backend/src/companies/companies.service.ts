import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  PermissionsService,
  type RequestActor,
} from '../permissions/permissions.service';

type CreateCompanyInput = {
  name: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  ekeyReference?: string;
  address: {
    street: string;
    exteriorNumber: string;
    interiorNumber?: string;
    colony?: string;
    postalCode: string;
    city: string;
    state: string;
    country?: string;
  };
  contacts: {
    name: string;
    position?: string;
    email?: string;
    phone?: string;
    whatsappPhone?: string;
    notes?: string;
    isPrimary?: boolean;
  }[];
  memberId: string;
  templateIds: string[];
};

type PostalCodeResponse = {
  'post code'?: unknown;
  places?: unknown;
};

@Injectable()
export class CompaniesService {
  private readonly postalCodeCache = new Map<
    string,
    {
      expiresAt: number;
      result: {
        postalCode: string;
        options: { state: string; city: string }[];
      };
    }
  >();
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(actor: RequestActor, input: CreateCompanyInput) {
    await this.permissions.canManageMember(actor, input.memberId);
    const templateIds = [...new Set(input.templateIds)];
    const templates = await this.prisma.activity_templates.findMany({
      where: { id: { in: templateIds }, is_active: true },
      select: {
        id: true,
        name: true,
        area: true,
        default_weight: true,
        display_order: true,
      },
      orderBy: { display_order: 'asc' },
    });
    if (templates.length !== templateIds.length) {
      throw new BadRequestException('Una o mas actividades no estan activas');
    }
    const contacts = input.contacts
      .map((contact, index) => ({
        name: contact.name.trim(),
        position: this.optionalText(contact.position),
        email: this.optionalText(contact.email)?.toLowerCase() ?? null,
        phone: this.optionalText(contact.phone),
        whatsappPhone: this.optionalText(contact.whatsappPhone),
        notes: this.optionalText(contact.notes),
        isPrimary: contact.isPrimary || index === 0,
      }))
      .filter((contact) => contact.name);
    if (
      !contacts.length ||
      contacts.some(
        (contact) => !contact.email && !contact.phone && !contact.whatsappPhone,
      )
    ) {
      throw new BadRequestException(
        'Cada contacto requiere nombre y al menos un medio de contacto',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const client = await transaction.clients.create({
        data: {
          name: input.name.trim(),
          legal_name: input.legalName.trim(),
          rfc: input.rfc.trim().toUpperCase(),
          tax_regime: input.taxRegime.trim(),
          ekey_reference: this.optionalText(input.ekeyReference),
          address_street: input.address.street.trim(),
          address_ext_no: input.address.exteriorNumber.trim(),
          address_int_no: this.optionalText(input.address.interiorNumber),
          address_colony: this.optionalText(input.address.colony),
          address_postal_code: input.address.postalCode.trim(),
          address_city: input.address.city.trim(),
          address_state: input.address.state.trim(),
          address_country: input.address.country?.trim() || 'Mexico',
          member_id: input.memberId,
        },
        select: { id: true },
      });
      await transaction.contacts.createMany({
        data: contacts.map((contact) => ({
          client_id: client.id,
          name: contact.name,
          position: contact.position,
          email: contact.email,
          phone: contact.phone,
          whatsapp_phone: contact.whatsappPhone,
          notes: contact.notes,
          created_by: actor.id,
          is_primary: contact.isPrimary,
        })),
      });
      await transaction.client_activities.createMany({
        data: templates.map((template, index) => ({
          client_id: client.id,
          template_id: template.id,
          name: template.name,
          area: template.area,
          weight: template.default_weight,
          display_order: index + 1,
        })),
      });
      return { clientId: client.id };
    });
  }

  async lookupPostalCode(postalCode: string) {
    if (!/^\d{5}$/.test(postalCode)) {
      throw new BadRequestException(
        'El codigo postal debe tener cinco digitos',
      );
    }
    const cached = this.postalCodeCache.get(postalCode);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    const response = await fetch(`https://api.zippopotam.us/mx/${postalCode}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new BadRequestException('Codigo postal no encontrado');
    }
    const payload = (await response.json()) as PostalCodeResponse;
    const places = Array.isArray(payload.places) ? payload.places : [];
    const options = places.flatMap((place) => {
      if (!place || typeof place !== 'object') return [];
      const value = place as { state?: unknown; 'place name'?: unknown };
      return typeof value.state === 'string' &&
        typeof value['place name'] === 'string'
        ? [{ state: value.state, city: value['place name'] }]
        : [];
    });
    const result = {
      postalCode,
      options: [
        ...new Map(
          options.map((option) => [`${option.state}:${option.city}`, option]),
        ).values(),
      ],
    };
    this.postalCodeCache.set(postalCode, {
      expiresAt: Date.now() + 86_400_000,
      result,
    });
    return result;
  }

  private optionalText(value: string | undefined) {
    const normalized = value?.trim();
    return normalized || null;
  }
}
