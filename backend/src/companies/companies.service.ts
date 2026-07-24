import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  PermissionsService,
  type RequestActor,
} from '../permissions/permissions.service';

type CreateCompanyInput = {
  name: string;
  memberId: string;
  templateIds: string[];
};

@Injectable()
export class CompaniesService {
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

    return this.prisma.$transaction(async (transaction) => {
      const client = await transaction.clients.create({
        data: { name: input.name.trim(), member_id: input.memberId },
        select: { id: true },
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
}
