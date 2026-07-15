import { BadRequestException } from '@nestjs/common';
import { CharactersService } from './characters.service';

function makeOpportunitiesMock() {
  return {
    interruptActiveRest: jest.fn(),
    startRestActivity: jest.fn(),
  };
}

function makePrismaMock() {
  return {
    character: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    planet: {
      findUnique: jest.fn(),
    },
    district: {
      findUnique: jest.fn(),
    },
    building: {
      findUnique: jest.fn(),
    },
    relationship: {
      findFirst: jest.fn(),
    },
    opportunityInstance: {
      findFirst: jest.fn(),
    },
    itemInstance: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

const baseCharacter = {
  id: 'char-1',
  playerId: 'player-1',
  name: 'Nova Rook',
  credits: 250,
  energy: 80,
  maxEnergy: 100,
  wantedLevel: 0,
  currentPlanetId: 'planet-a',
  currentDistrictId: 'district-a',
  currentBuildingId: 'building-a',
  currentDistrict: { id: 'district-a', dangerLevel: 2 },
  currentPlanet: { id: 'planet-a', name: 'Antrolus' },
  currentBuilding: { id: 'building-a', name: 'Arrival Processing Hub' },
  player: {
    id: 'player-1',
    username: 'test_player',
    passwordHash: 'hash',
  },
};

const destinationPlanet = {
  id: 'planet-a',
  name: 'Antrolus',
  dangerLevel: 3,
  lawLevel: 4,
};

const destinationDistrict = {
  id: 'district-b',
  name: 'Furnace Row',
  planetId: 'planet-a',
  dangerLevel: 4,
  lawLevel: 3,
  economyLevel: 3,
  planet: destinationPlanet,
  controllingFaction: null,
  controllingFactionId: null,
};

describe('CharactersService travel restrictions', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let opportunities: ReturnType<typeof makeOpportunitiesMock>;
  let service: CharactersService;

  beforeEach(() => {
    prisma = makePrismaMock();
    opportunities = makeOpportunitiesMock();
    service = new CharactersService(prisma as never, opportunities as never);

    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.planet.findUnique.mockResolvedValue(destinationPlanet);
    prisma.district.findUnique.mockResolvedValue(destinationDistrict);
    prisma.relationship.findFirst.mockResolvedValue(null);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
    opportunities.interruptActiveRest.mockResolvedValue(null);
  });

  it('marks travel quotes as blocked while a gig is in progress', async () => {
    prisma.opportunityInstance.findFirst.mockResolvedValue({
      id: 'inst-1',
      status: 'IN_PROGRESS',
      definition: {
        title: 'Move the Medical Crates',
        kind: 'GIG',
      },
    });

    const quote = await service.travelQuote('char-1', 'player-1', {
      planetId: 'planet-a',
      districtId: 'district-b',
    });

    expect(quote.blocked).toBe(true);
    expect(quote.affordable).toBe(false);
    expect(quote.warnings[0]).toContain('Finish your current gig');
    expect(quote.warnings[0]).toContain('Move the Medical Crates');
  });

  it('rejects travel while a job is active', async () => {
    prisma.opportunityInstance.findFirst.mockResolvedValue({
      id: 'inst-2',
      status: 'ACCEPTED',
      definition: {
        title: 'Helix Security Shift',
        kind: 'JOB',
      },
    });

    await expect(
      service.travel('char-1', 'player-1', {
        planetId: 'planet-a',
        districtId: 'district-b',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.travel('char-1', 'player-1', {
        planetId: 'planet-a',
        districtId: 'district-b',
      }),
    ).rejects.toThrow(/Finish your current job, Helix Security Shift, before travelling/);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });
});
describe('CharactersService.allocateStatPoints', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let opportunities: ReturnType<typeof makeOpportunitiesMock>;
  let service: CharactersService;

  const trainee = {
    ...baseCharacter,
    strength: 5,
    agility: 5,
    intelligence: 5,
    charisma: 5,
    hacking: 5,
    combat: 5,
    stealth: 5,
    engineering: 19,
    unspentStatPoints: 3,
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    opportunities = makeOpportunitiesMock();
    service = new CharactersService(prisma as never, opportunities as never);
  });

  it('applies allocations and decrements the pool', async () => {
    prisma.character.findUnique.mockResolvedValue(trainee);
    prisma.character.update.mockResolvedValue({ ...trainee, hacking: 7, unspentStatPoints: 1 });

    await service.allocateStatPoints('char-1', 'player-1', { hacking: 2 });

    expect(prisma.character.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { hacking: 7, unspentStatPoints: 1 },
    });
    expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
  });

  it('rejects allocating more points than available', async () => {
    prisma.character.findUnique.mockResolvedValue(trainee);
    await expect(
      service.allocateStatPoints('char-1', 'player-1', { hacking: 2, combat: 2 }),
    ).rejects.toThrow(/Not enough stat points/);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it('rejects unknown stats and non-positive amounts', async () => {
    prisma.character.findUnique.mockResolvedValue(trainee);
    await expect(
      service.allocateStatPoints('char-1', 'player-1', { credits: 1 }),
    ).rejects.toThrow(/Unknown stat/);
    await expect(
      service.allocateStatPoints('char-1', 'player-1', { hacking: -1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('enforces the runtime stat cap', async () => {
    prisma.character.findUnique.mockResolvedValue(trainee);
    await expect(
      service.allocateStatPoints('char-1', 'player-1', { engineering: 2 }),
    ).rejects.toThrow(/capped at 20/);
  });
});

describe('CharactersService equip/unequip', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let opportunities: ReturnType<typeof makeOpportunitiesMock>;
  let service: CharactersService;

  const toolItem = {
    id: 'item-1',
    ownerType: 'CHARACTER',
    ownerId: 'char-1',
    condition: 100,
    equippedSlot: null,
    itemDefinition: {
      id: 'def-1',
      name: 'Cheap Hacking Deck',
      category: 'TOOL',
      rarity: 'COMMON',
      toolData: { statBonuses: { hacking: 2 } },
    },
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    opportunities = makeOpportunitiesMock();
    service = new CharactersService(prisma as never, opportunities as never);
    prisma.character.findUnique.mockResolvedValue(baseCharacter);
  });

  it('equips a tool into the TOOL slot and clears the previous occupant', async () => {
    prisma.itemInstance.findUnique.mockResolvedValue(toolItem);
    prisma.itemInstance.findMany.mockResolvedValue([
      { ...toolItem, equippedSlot: 'TOOL' },
    ]);

    const view = await service.equipItem('char-1', 'player-1', 'item-1');

    expect(prisma.itemInstance.updateMany).toHaveBeenCalledWith({
      where: { ownerType: 'CHARACTER', ownerId: 'char-1', equippedSlot: 'TOOL' },
      data: { equippedSlot: null },
    });
    expect(prisma.itemInstance.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { equippedSlot: 'TOOL' },
    });
    expect(view.bonuses).toEqual({ hacking: 2 });
  });

  it('rejects equipping non-equippable categories', async () => {
    prisma.itemInstance.findUnique.mockResolvedValue({
      ...toolItem,
      itemDefinition: { ...toolItem.itemDefinition, category: 'CONSUMABLE' },
    });
    await expect(service.equipItem('char-1', 'player-1', 'item-1')).rejects.toThrow(
      /cannot be equipped/,
    );
  });

  it('rejects equipping broken or already-equipped items', async () => {
    prisma.itemInstance.findUnique.mockResolvedValue({ ...toolItem, equippedSlot: 'TOOL' });
    await expect(service.equipItem('char-1', 'player-1', 'item-1')).rejects.toThrow(
      /already equipped/,
    );

    prisma.itemInstance.findUnique.mockResolvedValue({ ...toolItem, condition: 0 });
    await expect(service.equipItem('char-1', 'player-1', 'item-1')).rejects.toThrow(/broken/);
  });

  it('rejects equipping items you do not own', async () => {
    prisma.itemInstance.findUnique.mockResolvedValue({ ...toolItem, ownerId: 'someone-else' });
    await expect(service.equipItem('char-1', 'player-1', 'item-1')).rejects.toThrow(
      /not found in your inventory/,
    );
  });

  it('unequips an equipped item', async () => {
    prisma.itemInstance.findUnique.mockResolvedValue({ ...toolItem, equippedSlot: 'TOOL' });
    prisma.itemInstance.findMany.mockResolvedValue([]);

    const view = await service.unequipItem('char-1', 'player-1', 'item-1');

    expect(prisma.itemInstance.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { equippedSlot: null },
    });
    expect(view.items).toEqual([]);
  });

  it('rejects unequipping an item that is not equipped', async () => {
    prisma.itemInstance.findUnique.mockResolvedValue(toolItem);
    await expect(service.unequipItem('char-1', 'player-1', 'item-1')).rejects.toThrow(
      /not equipped/,
    );
  });
});
