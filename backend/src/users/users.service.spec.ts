import { user_role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { type UserProfileRecord, UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

function readCreateData(input: unknown): object {
  if (!input || typeof input !== 'object' || !('data' in input)) {
    throw new Error('Expected Prisma create input');
  }
  const data = input.data;
  if (!data || typeof data !== 'object') {
    throw new Error('Expected Prisma create data');
  }
  return data;
}

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: { findProfileById: jest.Mock };
  let prisma: {
    profiles: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    groups: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findProfileById: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            profiles: { create: jest.fn(), findUnique: jest.fn() },
            groups: { findUnique: jest.fn(), update: jest.fn() },
          },
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
  });

  it('returns a profile from the repository', async () => {
    const profile: UserProfileRecord = {
      id: '1a26ec6d-44e6-49a0-b93f-2c5b1d2a47d2',
      name: 'Erick Ramirez',
      role: user_role.MEMBER,
      group_id: null,
      leader_id: null,
      created_at: new Date('2026-07-23T00:00:00.000Z'),
    };
    usersRepository.findProfileById.mockResolvedValue(profile);

    await expect(usersService.findProfileById(profile.id)).resolves.toEqual(
      profile,
    );
    expect(usersRepository.findProfileById).toHaveBeenCalledWith(profile.id);
  });

  it('clears hierarchy assignments for an administrator', async () => {
    let createInput: unknown;
    prisma.profiles.create.mockImplementation((input: unknown) => {
      createInput = input;
      return Promise.resolve({ id: 'admin-id' });
    });

    await usersService.createAdminUser('ADMIN', {
      name: 'Admin Local',
      email: 'ADMIN@EXAMPLE.COM',
      password: 'password123',
      role: 'ADMIN',
      groupId: 'group-id',
      leaderId: 'leader-id',
    });

    expect(readCreateData(createInput)).toMatchObject({
      email: 'admin@example.com',
      group_id: null,
      leader_id: null,
    });
    expect(prisma.groups.update).not.toHaveBeenCalled();
  });

  it('inherits the active leader group when creating a member', async () => {
    prisma.profiles.findUnique.mockResolvedValue({
      id: 'leader-id',
      role: user_role.LEADER,
      group_id: 'group-id',
      is_active: true,
    });
    let createInput: unknown;
    prisma.profiles.create.mockImplementation((input: unknown) => {
      createInput = input;
      return Promise.resolve({ id: 'member-id' });
    });

    await usersService.createAdminUser('ADMIN', {
      name: 'Contador Local',
      email: 'member@example.com',
      password: 'password123',
      role: 'MEMBER',
      leaderId: 'leader-id',
    });

    expect(readCreateData(createInput)).toMatchObject({
      group_id: 'group-id',
      leader_id: 'leader-id',
    });
  });
});
