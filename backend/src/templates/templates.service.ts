import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type CreateTemplateInput = {
  name: string;
  areaId: string;
  defaultWeight: number;
  scheduledMonths?: number[];
};

type UpdateTemplateInput = {
  defaultWeight?: number;
  isActive?: boolean;
  scheduledMonths?: number[];
};

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actorRole: string, actorId: string, input: CreateTemplateInput) {
    this.requireAdmin(actorRole);

    const area = await this.prisma.activity_areas.findUnique({
      where: { id: input.areaId },
      select: { id: true, name: true, is_active: true },
    });
    if (!area || !area.is_active) {
      throw new NotFoundException('Area no encontrada o inactiva');
    }

    const highestOrder = await this.prisma.activity_templates.aggregate({
      _max: { display_order: true },
    });
    return this.prisma.activity_templates.create({
      data: {
        name: input.name.trim(),
        area: area.name,
        area_id: area.id,
        default_weight: input.defaultWeight,
        scheduled_months: this.normalizeScheduledMonths(input.scheduledMonths),
        display_order: (highestOrder._max.display_order ?? 0) + 1,
        created_by: actorId,
      },
      select: {
        id: true,
        name: true,
        area: true,
        default_weight: true,
        scheduled_months: true,
        display_order: true,
        is_active: true,
        created_by: true,
      },
    });
  }

  async createArea(actorRole: string, name: string) {
    this.requireAdmin(actorRole);
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new NotFoundException('Nombre de area requerido');
    }
    return this.prisma.activity_areas.create({
      data: { name: normalizedName },
      select: { id: true, name: true, is_active: true, created_at: true },
    });
  }

  async update(actorRole: string, id: string, input: UpdateTemplateInput) {
    this.requireAdmin(actorRole);
    const template = await this.prisma.activity_templates.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException('Actividad estandar no encontrada');
    }

    return this.prisma.activity_templates.update({
      where: { id },
      data: {
        ...(input.defaultWeight === undefined
          ? {}
          : { default_weight: input.defaultWeight }),
        ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
        ...(input.scheduledMonths === undefined
          ? {}
          : {
              scheduled_months: this.normalizeScheduledMonths(
                input.scheduledMonths,
              ),
            }),
      },
      select: {
        id: true,
        name: true,
        area: true,
        default_weight: true,
        scheduled_months: true,
        display_order: true,
        is_active: true,
        created_by: true,
      },
    });
  }

  private requireAdmin(role: string): void {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Se requiere rol de administrador');
    }
  }

  private normalizeScheduledMonths(months: number[] | undefined): number[] {
    const normalized = [
      ...new Set(months ?? Array.from({ length: 12 }, (_, index) => index + 1)),
    ]
      .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
      .sort((left, right) => left - right);
    if (!normalized.length || normalized.length !== (months?.length ?? 12)) {
      throw new BadRequestException('Los meses programados no son validos');
    }
    return normalized;
  }
}
