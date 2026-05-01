import { BadRequestException } from '@nestjs/common';
import { CharactersService } from './characters.service';

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
    activityLog: {
      create: jest.fn(),
    },
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
  let service: CharactersService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new CharactersService(prisma as never);

    prisma.character.findUnique.mockResolvedValue(baseCharacter);
    prisma.planet.findUnique.mockResolvedValue(destinationPlanet);
    prisma.district.findUnique.mockResolvedValue(destinationDistrict);
    prisma.relationship.findFirst.mockResolvedValue(null);
    prisma.opportunityInstance.findFirst.mockResolvedValue(null);
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