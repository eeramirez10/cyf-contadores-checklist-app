import { user_role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { type UserProfileRecord, UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: { findProfileById: jest.Mock };

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
        { provide: PrismaService, useValue: { profiles: { create: jest.fn() } } },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get(UsersRepository);
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
});
