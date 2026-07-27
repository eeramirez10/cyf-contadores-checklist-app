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
  checklistTemplateIds: string[];
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
    const checklistTemplateIds = [...new Set(input.checklistTemplateIds)];
    const checklistTemplates = await this.prisma.checklist_templates.findMany({
      where: { id: { in: checklistTemplateIds }, is_active: true },
      select: {
        id: true,
        scheduled_months: true,
        activities: {
          select: {
            display_order: true,
            activity_template: {
              select: {
                id: true,
                name: true,
                area: true,
                default_weight: true,
                is_active: true,
              },
            },
          },
        },
      },
    });
    if (checklistTemplates.length !== checklistTemplateIds.length) {
      throw new BadRequestException('Una o mas plantillas no estan activas');
    }
    const activitiesById = new Map<
      string,
      {
        id: string;
        name: string;
        area: string;
        weight: unknown;
        months: number[];
        displayOrder: number;
      }
    >();
    for (const checklistTemplate of checklistTemplates) {
      for (const membership of checklistTemplate.activities) {
        const activity = membership.activity_template;
        if (!activity.is_active) {
          throw new BadRequestException(
            'Una o mas actividades no estan activas',
          );
        }
        const existing = activitiesById.get(activity.id);
        activitiesById.set(activity.id, {
          id: activity.id,
          name: activity.name,
          area: activity.area,
          weight: activity.default_weight,
          months: [
            ...new Set([
              ...(existing?.months ?? []),
              ...checklistTemplate.scheduled_months,
            ]),
          ].sort((a, b) => a - b),
          displayOrder: Math.min(
            existing?.displayOrder ?? Infinity,
            membership.display_order,
          ),
        });
      }
    }
    const activities = [...activitiesById.values()].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    );
    if (!activities.length) {
      throw new BadRequestException(
        'Las plantillas no contienen actividades activas',
      );
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
        data: activities.map((activity, index) => ({
          client_id: client.id,
          template_id: activity.id,
          name: activity.name,
          area: activity.area,
          weight: activity.weight as never,
          scheduled_months: activity.months,
          display_order: index + 1,
        })),
      });
      await transaction.client_checklist_templates.createMany({
        data: checklistTemplates.map((template) => ({
          client_id: client.id,
          checklist_template_id: template.id,
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

  async annualAgenda(actor: RequestActor, clientId: string, year: number) {
    await this.permissions.canAccessClient(actor, clientId);
    const client = await this.prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, created_at: true },
    });
    if (!client) {
      throw new BadRequestException('Empresa no encontrada');
    }

    const activities = await this.prisma.client_activities.findMany({
      where: { client_id: clientId },
      select: {
        template_id: true,
        name: true,
        area: true,
        weight: true,
        scheduled_months: true,
        is_active: true,
        created_at: true,
      },
    });
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}`;
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return `${year}-${String(month).padStart(2, '0')}`;
    });
    const expectedByMonth = new Map(
      months.map((month) => [
        month,
        activities.filter((activity) => {
          const monthNumber = Number(month.slice(5));
          const monthEnd = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59));
          return (
            activity.is_active &&
            activity.created_at <= monthEnd &&
            activity.scheduled_months.includes(monthNumber)
          );
        }),
      ]),
    );
    const entriesToCreate = months
      .filter((month) => month <= currentMonth)
      .flatMap((month) =>
        (expectedByMonth.get(month) ?? []).map((activity) => ({
          month,
          client_id: clientId,
          template_id: activity.template_id,
          activity_name: activity.name,
          area_snapshot: activity.area,
          weight_snapshot: activity.weight,
        })),
      );
    if (entriesToCreate.length) {
      await this.prisma.checklist_entries.createMany({
        data: entriesToCreate,
        skipDuplicates: true,
      });
    }

    const entries = await this.prisma.checklist_entries.findMany({
      where: { client_id: clientId, month: { in: months } },
      select: {
        month: true,
        template_id: true,
        completed: true,
        completed_at: true,
        activity_name: true,
        area_snapshot: true,
        weight_snapshot: true,
      },
    });
    const activitiesByTemplateId = new Map(
      activities.map((activity) => [activity.template_id, activity]),
    );
    const entriesByMonth = new Map<string, typeof entries>();
    for (const entry of entries) {
      const current = entriesByMonth.get(entry.month) ?? [];
      current.push(entry);
      entriesByMonth.set(entry.month, current);
    }
    const areaSummary = new Map<
      string,
      {
        totalWeight: number;
        completedWeight: number;
        expectedCount: number;
        completedCount: number;
      }
    >();
    for (const entry of entries) {
      const activity = activitiesByTemplateId.get(entry.template_id);
      const area = entry.area_snapshot ?? activity?.area ?? 'Sin area';
      const weight = Number(entry.weight_snapshot ?? activity?.weight ?? 0);
      const summary = areaSummary.get(area) ?? {
        totalWeight: 0,
        completedWeight: 0,
        expectedCount: 0,
        completedCount: 0,
      };
      summary.totalWeight += weight;
      summary.expectedCount += 1;
      if (entry.completed) {
        summary.completedWeight += weight;
        summary.completedCount += 1;
      }
      areaSummary.set(area, summary);
    }

    return {
      company: { id: client.id, name: client.name },
      year,
      areas: [...areaSummary.entries()]
        .map(([name, summary]) => ({
          name,
          expectedCount: summary.expectedCount,
          completedCount: summary.completedCount,
          progress:
            summary.totalWeight > 0
              ? Math.round(
                  (summary.completedWeight / summary.totalWeight) * 1000,
                ) / 10
              : null,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      months: months.map((month) => {
        const period =
          month > currentMonth
            ? 'FUTURE'
            : month === currentMonth
              ? 'CURRENT'
              : 'PAST';
        const expected = expectedByMonth.get(month) ?? [];
        const entriesForMonth = entriesByMonth.get(month) ?? [];
        const totalWeight = entriesForMonth.reduce(
          (total, entry) =>
            total +
            Number(
              entry.weight_snapshot ??
                activitiesByTemplateId.get(entry.template_id)?.weight ??
                0,
            ),
          0,
        );
        const completedWeight = entriesForMonth.reduce((total, entry) => {
          if (!entry.completed) return total;
          return (
            total +
            Number(
              entry.weight_snapshot ??
                activitiesByTemplateId.get(entry.template_id)?.weight ??
                0,
            )
          );
        }, 0);
        const pending = entriesForMonth
          .filter((entry) => !entry.completed && period !== 'FUTURE')
          .map((entry) => {
            const activity = activitiesByTemplateId.get(entry.template_id);
            return {
              templateId: entry.template_id,
              name: entry.activity_name ?? activity?.name ?? 'Actividad',
              area: entry.area_snapshot ?? activity?.area ?? 'Sin area',
              weight: Number(entry.weight_snapshot ?? activity?.weight ?? 0),
              status: period === 'PAST' ? 'OVERDUE' : 'PENDING',
            };
          });
        return {
          month,
          period,
          expectedCount:
            period === 'FUTURE' ? expected.length : entriesForMonth.length,
          completedCount: entriesForMonth.filter((entry) => entry.completed)
            .length,
          progress:
            totalWeight > 0
              ? Math.round((completedWeight / totalWeight) * 1000) / 10
              : null,
          pending,
        };
      }),
    };
  }

  private optionalText(value: string | undefined) {
    const normalized = value?.trim();
    return normalized || null;
  }
}
