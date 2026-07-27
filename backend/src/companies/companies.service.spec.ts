import { CompaniesService } from './companies.service';

describe('CompaniesService annual agenda', () => {
  const permissions = {
    canAccessClient: jest.fn(),
    canManageMember: jest.fn(),
  };
  const prisma = {
    clients: { findUnique: jest.fn() },
    client_activities: { findMany: jest.fn() },
    checklist_entries: { createMany: jest.fn(), findMany: jest.fn() },
  };
  const service = new CompaniesService(prisma as never, permissions as never);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-26T12:00:00.000Z'));
    jest.clearAllMocks();
    permissions.canAccessClient.mockResolvedValue(undefined);
    prisma.clients.findUnique.mockResolvedValue({
      id: 'client-1',
      name: 'Life Solutions',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.client_activities.findMany.mockResolvedValue([
      {
        template_id: 'activity-1',
        name: 'Declaracion mensual',
        area: 'Fiscal',
        weight: 10,
        scheduled_months: [1, 2],
        is_active: true,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    prisma.checklist_entries.createMany.mockResolvedValue({ count: 0 });
    prisma.checklist_entries.findMany.mockResolvedValue([
      {
        month: '2026-01',
        template_id: 'activity-1',
        completed: true,
        completed_at: new Date('2026-01-15T00:00:00.000Z'),
        activity_name: 'Declaracion mensual',
        area_snapshot: 'Fiscal',
        weight_snapshot: 10,
      },
      {
        month: '2026-02',
        template_id: 'activity-1',
        completed: false,
        completed_at: null,
        activity_name: 'Declaracion mensual',
        area_snapshot: 'Fiscal',
        weight_snapshot: 10,
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns weighted progress and overdue tasks for scheduled months', async () => {
    const agenda = await service.annualAgenda(
      { id: 'admin-1', role: 'ADMIN' },
      'client-1',
      2026,
    );

    expect(prisma.checklist_entries.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(agenda.months[0]).toMatchObject({
      month: '2026-01',
      progress: 100,
      completedCount: 1,
      expectedCount: 1,
    });
    expect(agenda.months[1]).toMatchObject({
      month: '2026-02',
      progress: 0,
      pending: [
        expect.objectContaining({
          name: 'Declaracion mensual',
          status: 'OVERDUE',
        }),
      ],
    });
    expect(agenda.areas).toEqual([
      {
        name: 'Fiscal',
        expectedCount: 2,
        completedCount: 1,
        progress: 50,
      },
    ]);
  });
});
