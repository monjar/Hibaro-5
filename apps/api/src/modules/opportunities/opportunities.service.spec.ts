import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';

function makePrismaMock() {
  return {
    opportunityDefinition: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    character: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    opportunityInstance: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    jobEmployment: {
      deleteMany: jest.fn(),
    },
    relationship: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  };
}

const baseCharacter = {
  id: 'char-1',
  playerId: 'player-1',
  name: 'Nova Rook',
  credits: 1000,
  hacking: 5,
  intelligence: 5,
  health: 100,
  maxHealth: 100,
  energy: 100,
  maxEnergy: 100,
  wantedLevel: 0,
  strength: 5,
  agility: 5,
  charisma: 5,
  combat: 5,
  stealth: 5,
  engineering: 5,
  reputation: 0,
};

const baseDefinition = {
  id: 'opp-1',
  title: 'Move medical crates',
  kind: 'GIG',
  type: 'DELIVERY',
  difficulty: 1,
  requirements: [],
  durationMinutes: 60,
};

describe('OpportunitiesService.acceptOpportunity', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let jobs: { findActiveEmployment: jest.Mock; markShiftCompleted: jest.Mock };
  let service: OpportunitiesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    jobs = {
      findActiveEmployment: jest.fn().mockResolvedValue(null),
      markShiftCompleted: jest.fn().mockResolvedValue(undefined),
    };
    service = new OpportunitiesService(prisma as never, jobs as never);
  });

  it('accepts when nothing is in progress', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue(baseDefinition);
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.create.mockResolvedValue({
      id: 'inst-1',
      definitionId: baseDefinition.id,
      characterId: baseCharacter.id,
      status: 'IN_PROGRESS',
    });

    const result = await service.acceptOpportunity('opp-1', 'char-1', 'player-1');

    expect(result).toMatchObject({ id: 'inst-1' });
    expect(prisma.opportunityInstance.create).toHaveBeenCalledTimes(1);
    expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
  });

  it('rejects accepting the same opportunity twice', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue(baseDefinition);
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue({
      id: 'inst-existing',
      definitionId: 'opp-1',
      definition: { title: 'Move medical crates' },
    });

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(/already in progress/);
    expect(prisma.opportunityInstance.create).not.toHaveBeenCalled();
  });

  it('rejects accepting a different opportunity while one is already active', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue(baseDefinition);
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue({
      id: 'inst-existing',
      definitionId: 'opp-other',
      definition: { title: 'Patrol the dock' },
    });

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(/Patrol the dock/);
    expect(prisma.opportunityInstance.create).not.toHaveBeenCalled();
  });

  it('rejects when the player does not own the character', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue(baseDefinition);
    prisma.character.findUnique.mockResolvedValue({ ...baseCharacter, playerId: 'someone-else' });

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.opportunityInstance.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when the opportunity does not exist', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue(null);
    prisma.character.findUnique.mockResolvedValue(baseCharacter);

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects accepting a JOB shift when not employed', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({
      ...baseDefinition,
      kind: 'JOB',
      title: 'Dock loader',
    });
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.findMany.mockResolvedValue([]);
    jobs.findActiveEmployment.mockResolvedValue(null);

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(/not employed/);
    expect(prisma.opportunityInstance.create).not.toHaveBeenCalled();
  });

  it('accepts a JOB shift when an active employment exists', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({
      ...baseDefinition,
      kind: 'JOB',
      title: 'Dock loader',
    });
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.findMany.mockResolvedValue([]);
    jobs.findActiveEmployment.mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' });
    prisma.opportunityInstance.create.mockResolvedValue({
      id: 'inst-shift',
      definitionId: 'opp-1',
      status: 'IN_PROGRESS',
    });

    const result = await service.acceptOpportunity('opp-1', 'char-1', 'player-1');
    expect(result).toMatchObject({ id: 'inst-shift' });
    expect(jobs.findActiveEmployment).toHaveBeenCalledWith('char-1', 'opp-1');
  });

  it('rejects a JOB shift when employment is not ACTIVE (e.g. FIRED)', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({
      ...baseDefinition,
      kind: 'JOB',
      title: 'Dock loader',
    });
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.findMany.mockResolvedValue([]);
    jobs.findActiveEmployment.mockResolvedValue({ id: 'emp-1', status: 'FIRED' });

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(/not employed/);
  });

  it('rejects when stat requirements are not met', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({
      ...baseDefinition,
      requirements: [{ type: 'STAT_MIN', key: 'hacking', value: 8 }],
    });
    prisma.character.findUnique.mockResolvedValue({ ...baseCharacter, hacking: 4 });
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.findMany.mockResolvedValue([]);

    await expect(
      service.acceptOpportunity('opp-1', 'char-1', 'player-1'),
    ).rejects.toThrow(/hacking must be >= 8/);
  });

  it('rejects locked follow-up quests until the prerequisite is completed', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({
      ...baseDefinition,
      kind: 'QUEST',
      id: 'quest-2',
    });
    prisma.opportunityDefinition.findMany.mockResolvedValue([
      {
        ...baseDefinition,
        kind: 'QUEST',
        id: 'quest-1',
        rewards: [{ type: 'UNLOCK_QUEST', questId: 'quest-2' }],
      },
      {
        ...baseDefinition,
        kind: 'QUEST',
        id: 'quest-2',
      },
    ]);
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.opportunityInstance.findMany.mockResolvedValue([]);

    await expect(service.acceptOpportunity('quest-2', 'char-1', 'player-1')).rejects.toThrow(
      /Quest is locked/,
    );
  });
});

describe('OpportunitiesService admin CRUD', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let jobs: { findActiveEmployment: jest.Mock; markShiftCompleted: jest.Mock };
  let service: OpportunitiesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    jobs = {
      findActiveEmployment: jest.fn().mockResolvedValue(null),
      markShiftCompleted: jest.fn().mockResolvedValue(undefined),
    };
    service = new OpportunitiesService(prisma as never, jobs as never);
  });

  it('creates a new definition with sane defaults', async () => {
    prisma.opportunityDefinition.create.mockResolvedValue({ id: 'new-1' });
    const result = await service.createDefinition({
      title: 'Move boxes',
      kind: 'GIG',
      type: 'DELIVERY',
    });
    expect(result).toMatchObject({ id: 'new-1' });
    expect(prisma.opportunityDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Move boxes',
        kind: 'GIG',
        difficulty: 1,
        durationMinutes: 60,
      }),
    });
  });

  it('rejects creation with too-short title', async () => {
    await expect(
      service.createDefinition({ title: 'X', kind: 'GIG', type: 'DELIVERY' }),
    ).rejects.toThrow(/at least 3/);
    expect(prisma.opportunityDefinition.create).not.toHaveBeenCalled();
  });

  it('rejects creation with invalid kind', async () => {
    await expect(
      service.createDefinition({ title: 'Valid title', kind: 'BOGUS' as never, type: 'DELIVERY' }),
    ).rejects.toThrow(/GIG, JOB, or QUEST/);
  });

  it('rejects creation with out-of-range difficulty', async () => {
    await expect(
      service.createDefinition({
        title: 'Valid title',
        kind: 'GIG',
        type: 'DELIVERY',
        difficulty: 99,
      }),
    ).rejects.toThrow(/Difficulty must be/);
  });

  it('refuses to delete a definition with in-progress instances', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({ id: 'opp-1' });
    prisma.opportunityInstance.count.mockResolvedValue(2);
    await expect(service.deleteDefinition('opp-1')).rejects.toThrow(/still in progress/);
    expect(prisma.opportunityDefinition.delete).not.toHaveBeenCalled();
  });

  it('cascades delete: removes instances, employments, then definition', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({ id: 'opp-1' });
    prisma.opportunityInstance.count.mockResolvedValue(0);
    prisma.opportunityInstance.deleteMany.mockResolvedValue({ count: 5 });
    prisma.jobEmployment.deleteMany.mockResolvedValue({ count: 1 });
    prisma.opportunityDefinition.delete.mockResolvedValue({ id: 'opp-1' });

    const result = await service.deleteDefinition('opp-1');
    expect(result).toEqual({ deleted: true, id: 'opp-1' });
    expect(prisma.opportunityInstance.deleteMany).toHaveBeenCalledWith({
      where: { definitionId: 'opp-1' },
    });
    expect(prisma.jobEmployment.deleteMany).toHaveBeenCalledWith({
      where: { opportunityId: 'opp-1' },
    });
    expect(prisma.opportunityDefinition.delete).toHaveBeenCalled();
  });

  it('only sends provided fields to update', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({ id: 'opp-1' });
    prisma.opportunityDefinition.update.mockResolvedValue({ id: 'opp-1', title: 'New Name' });

    await service.updateDefinition('opp-1', { title: 'New Name' });

    const call = prisma.opportunityDefinition.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'opp-1' });
    expect(call.data).toEqual({ title: 'New Name' });
  });

  it('rejects empty update payloads', async () => {
    prisma.opportunityDefinition.findUnique.mockResolvedValue({ id: 'opp-1' });
    await expect(service.updateDefinition('opp-1', {})).rejects.toThrow(/No fields/);
  });
});
