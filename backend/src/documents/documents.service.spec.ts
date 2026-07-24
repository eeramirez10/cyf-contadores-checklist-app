import { BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const permissions = {
    canAccessClient: jest.fn(),
    visibleMemberIds: jest.fn(),
  };
  const prisma = {
    clients: { findMany: jest.fn() },
    contacts: { create: jest.fn() },
  };
  const service = new DocumentsService(prisma as never, permissions as never);

  beforeEach(() => {
    jest.clearAllMocks();
    permissions.canAccessClient.mockResolvedValue(undefined);
  });

  it('limits the company list to members visible to the requester', async () => {
    permissions.visibleMemberIds.mockResolvedValue(['member-1']);
    prisma.clients.findMany.mockResolvedValue([]);

    await service.listClients({ id: 'leader-1', role: 'LEADER' });

    expect(prisma.clients.findMany).toHaveBeenCalledWith({
      where: { is_active: true, member_id: { in: ['member-1'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });

  it('rejects an upload that is not a PDF before storing it', async () => {
    await expect(
      service.createDocument(
        { id: 'admin-1', role: 'ADMIN' },
        'client-1',
        'Archivo',
        undefined,
        {
          buffer: Buffer.from('not a PDF'),
          mimetype: 'text/plain',
          originalname: 'archivo.txt',
          size: 9,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
