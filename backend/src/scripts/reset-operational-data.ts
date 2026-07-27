import { NestFactory } from '@nestjs/core';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

type ActivitySeed = { name: string; area: string; weight: number };

const activitySeeds: ActivitySeed[] = [
  { name: 'Declaracion provisional', area: 'Fiscal', weight: 35 },
  { name: 'Revision de CFDI', area: 'Fiscal', weight: 30 },
  { name: 'DIOT', area: 'Fiscal', weight: 35 },
  { name: 'Conciliacion bancaria', area: 'Contabilidad', weight: 35 },
  { name: 'Polizas contables', area: 'Contabilidad', weight: 35 },
  { name: 'Estados financieros', area: 'Contabilidad', weight: 30 },
  { name: 'Calculo de nomina', area: 'Nomina', weight: 40 },
  { name: 'Timbre de recibos', area: 'Nomina', weight: 30 },
  { name: 'Altas y bajas IMSS', area: 'Nomina', weight: 30 },
  { name: 'Declaracion anual', area: 'Anual', weight: 50 },
  { name: 'Informativa anual', area: 'Anual', weight: 50 },
];

const packageSeeds = [
  {
    name: 'Fiscal mensual',
    months: MONTHS,
    activities: ['Declaracion provisional', 'Revision de CFDI', 'DIOT'],
  },
  {
    name: 'Contabilidad mensual',
    months: MONTHS,
    activities: [
      'Conciliacion bancaria',
      'Polizas contables',
      'Estados financieros',
    ],
  },
  {
    name: 'Nomina mensual',
    months: MONTHS,
    activities: [
      'Calculo de nomina',
      'Timbre de recibos',
      'Altas y bajas IMSS',
    ],
  },
  {
    name: 'Obligaciones anuales',
    months: [3, 4],
    activities: ['Declaracion anual', 'Informativa anual'],
  },
];

const companySeeds = [
  {
    name: 'Life Solutions',
    legalName: 'Life Solutions Mexico, S.A. de C.V.',
    rfc: 'LSM240101AB1',
    packages: ['Fiscal mensual', 'Contabilidad mensual', 'Nomina mensual'],
  },
  {
    name: 'Grupo Horizonte',
    legalName: 'Grupo Horizonte Consultores, S.A. de C.V.',
    rfc: 'GHC240101CD2',
    packages: [
      'Fiscal mensual',
      'Contabilidad mensual',
      'Obligaciones anuales',
    ],
  },
  {
    name: 'Comercial del Bajio',
    legalName: 'Comercial del Bajio, S. de R.L. de C.V.',
    rfc: 'CBA240101EF3',
    packages: ['Fiscal mensual', 'Nomina mensual'],
  },
];

async function clearDocumentStorage() {
  const storageDir = path.resolve(
    process.env.DOCUMENTS_STORAGE_DIR?.trim() || 'storage/documents',
  );
  const entries = await readdir(storageDir).catch(() => [] as string[]);
  await Promise.all(
    entries.map((entry) =>
      rm(path.join(storageDir, entry), { recursive: true, force: true }),
    ),
  );
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const prisma = app.get(PrismaService);
    const members = await prisma.profiles.findMany({
      where: { role: 'MEMBER', is_active: true },
      select: { id: true },
      orderBy: { name: 'asc' },
    });
    const creator = await prisma.profiles.findFirst({
      where: { is_active: true },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    if (!members.length || !creator) {
      throw new Error('Se requiere al menos un usuario activo con rol MEMBER');
    }

    await clearDocumentStorage();
    await prisma.$transaction(
      async (transaction) => {
        await transaction.document_deliveries.deleteMany();
        await transaction.documents.deleteMany();
        await transaction.contacts.deleteMany();
        await transaction.checklist_entries.deleteMany();
        await transaction.client_checklist_templates.deleteMany();
        await transaction.client_activities.deleteMany();
        await transaction.clients.deleteMany();
        await transaction.checklist_template_activities.deleteMany();
        await transaction.checklist_templates.deleteMany();
        await transaction.activity_templates.deleteMany();
        await transaction.activity_areas.deleteMany();
        await transaction.activities.deleteMany();
        await transaction.employees.deleteMany();

        const areas = new Map<string, string>();
        for (const areaName of [
          ...new Set(activitySeeds.map((activity) => activity.area)),
        ]) {
          const area = await transaction.activity_areas.create({
            data: { name: areaName },
          });
          areas.set(areaName, area.id);
        }
        const activities = new Map<
          string,
          { id: string; area: string; weight: number }
        >();
        for (const [index, activity] of activitySeeds.entries()) {
          const created = await transaction.activity_templates.create({
            data: {
              name: activity.name,
              area: activity.area,
              area_id: areas.get(activity.area),
              default_weight: activity.weight,
              display_order: index + 1,
              created_by: creator.id,
            },
          });
          activities.set(activity.name, {
            id: created.id,
            area: activity.area,
            weight: activity.weight,
          });
        }
        const packages = new Map<
          string,
          { id: string; months: number[]; activityIds: string[] }
        >();
        for (const packageSeed of packageSeeds) {
          const checklistTemplate =
            await transaction.checklist_templates.create({
              data: {
                name: packageSeed.name,
                scheduled_months: packageSeed.months,
              },
            });
          const packageActivities = packageSeed.activities.map((name) =>
            activities.get(name)!,
          );
          await transaction.checklist_template_activities.createMany({
            data: packageActivities.map((activity, index) => ({
              checklist_template_id: checklistTemplate.id,
              activity_template_id: activity.id,
              display_order: index + 1,
            })),
          });
          packages.set(packageSeed.name, {
            id: checklistTemplate.id,
            months: packageSeed.months,
            activityIds: packageActivities.map((activity) => activity.id),
          });
        }

        const current = new Date();
        const year = current.getUTCFullYear();
        const currentMonth = current.getUTCMonth() + 1;
        for (const [companyIndex, company] of companySeeds.entries()) {
          const member = members[companyIndex % members.length];
          const client = await transaction.clients.create({
            data: {
              name: company.name,
              legal_name: company.legalName,
              rfc: company.rfc,
              tax_regime: '601 - General de Ley Personas Morales',
              address_street: 'Av. Reforma',
              address_ext_no: String(100 + companyIndex),
              address_colony: 'Centro',
              address_postal_code: '06000',
              address_city: 'Ciudad de Mexico',
              address_state: 'Ciudad de Mexico',
              member_id: member.id,
            },
          });
          await transaction.contacts.create({
            data: {
              client_id: client.id,
              name: `Contacto ${company.name}`,
              email: `contacto${companyIndex + 1}@ejemplo.com`,
              phone: `55500000${companyIndex + 1}`,
              is_primary: true,
              created_by: creator.id,
            },
          });
          const selectedPackages = company.packages.map((name) =>
            packages.get(name)!,
          );
          await transaction.client_checklist_templates.createMany({
            data: selectedPackages.map((item) => ({
              client_id: client.id,
              checklist_template_id: item.id,
            })),
          });
          const companyActivities = new Map<
            string,
            { months: number[]; displayOrder: number }
          >();
          selectedPackages.forEach((item, packageIndex) =>
            item.activityIds.forEach((activityId, activityIndex) => {
              const existing = companyActivities.get(activityId);
              companyActivities.set(activityId, {
                months: [
                  ...new Set([...(existing?.months ?? []), ...item.months]),
                ],
                displayOrder: Math.min(
                  existing?.displayOrder ?? Infinity,
                  packageIndex * 100 + activityIndex,
                ),
              });
            }),
          );
          for (const [activityId, config] of companyActivities) {
            const activity = [...activities.values()].find(
              (item) => item.id === activityId,
            )!;
            await transaction.client_activities.create({
              data: {
                client_id: client.id,
                template_id: activityId,
                name:
                  activitySeeds.find(
                    (item) =>
                      item.name && activities.get(item.name)?.id === activityId,
                  )?.name ?? 'Actividad',
                area: activity.area,
                weight: activity.weight,
                scheduled_months: config.months,
                display_order: config.displayOrder,
              },
            });
            for (let month = 1; month <= currentMonth; month += 1) {
              if (!config.months.includes(month)) continue;
              const completed =
                (month + companyIndex + config.displayOrder) % 4 !== 0;
              await transaction.checklist_entries.create({
                data: {
                  month: `${year}-${String(month).padStart(2, '0')}`,
                  client_id: client.id,
                  template_id: activityId,
                  completed,
                  completed_at: completed
                    ? new Date(Date.UTC(year, month - 1, 18))
                    : null,
                  completed_by: completed ? member.id : null,
                  activity_name: activitySeeds.find(
                    (item) => activities.get(item.name)?.id === activityId,
                  )?.name,
                  area_snapshot: activity.area,
                  weight_snapshot: activity.weight,
                },
              });
            }
          }
        }
      },
      { timeout: 120_000 },
    );
    console.log(
      'Datos operativos reiniciados y datos de ejemplo creados. Usuarios y grupos se conservaron.',
    );
  } finally {
    await app.close();
  }
}

void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
