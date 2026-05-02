import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BuildingOwnerType, BuildingStatus, PlanetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type BuildingFunction =
  | 'SHOP'
  | 'SAFEHOUSE'
  | 'OFFICE'
  | 'HUB'
  | 'DOCK'
  | 'BAR'
  | 'CLINIC'
  | 'WAREHOUSE'
  | 'BLACK_MARKET'
  | 'MISSION_BOARD';

export interface AdminPlanetInput {
  solarSystemId: string;
  name: string;
  description?: string | null;
  planetType?: PlanetType;
  dangerLevel?: number;
  lawLevel?: number;
  economyLevel?: number;
}

export interface AdminDistrictInput {
  planetId: string;
  name: string;
  description?: string | null;
  controllingFactionId?: string | null;
  dangerLevel?: number;
  lawLevel?: number;
  economyLevel?: number;
}

export interface AdminBuildingInput {
  districtId: string;
  name: string;
  description?: string | null;
  ownerType?: BuildingOwnerType;
  ownerId?: string | null;
  functionality?: BuildingFunction[];
  status?: BuildingStatus;
}

const PLANET_TYPES: PlanetType[] = [
  'TERRESTRIAL',
  'GAS_GIANT',
  'ICE',
  'DESERT',
  'OCEAN',
  'ASTEROID_BELT',
  'STATION',
];

const BUILDING_FUNCTIONS: BuildingFunction[] = [
  'SHOP',
  'SAFEHOUSE',
  'OFFICE',
  'HUB',
  'DOCK',
  'BAR',
  'CLINIC',
  'WAREHOUSE',
  'BLACK_MARKET',
  'MISSION_BOARD',
];

const BUILDING_STATUSES: BuildingStatus[] = ['OPEN', 'CLOSED', 'DAMAGED', 'ABANDONED', 'LOCKED_DOWN'];

const BUILDING_OWNER_TYPES: BuildingOwnerType[] = ['CHARACTER', 'FACTION', 'CORPORATION', 'SYSTEM'];

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getSolarSystems() {
    return this.prisma.solarSystem.findMany({ include: { planets: true } });
  }

  async getPlanets() {
    return this.prisma.planet.findMany({ include: { solarSystem: true, districts: true } });
  }

  async getPlanetById(id: string) {
    const planet = await this.prisma.planet.findUnique({
      where: { id },
      include: { solarSystem: true, districts: { include: { buildings: true } } },
    });
    if (!planet) throw new NotFoundException(`Planet ${id} not found`);
    return planet;
  }

  async getDistrictById(id: string) {
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: { planet: true, buildings: true, controllingFaction: true },
    });
    if (!district) throw new NotFoundException(`District ${id} not found`);
    return district;
  }

  async getBuildingById(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: { district: { include: { planet: true } } },
    });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  async getDistricts() {
    return this.prisma.district.findMany({
      include: { planet: true, controllingFaction: true },
      orderBy: { name: 'asc' },
    });
  }

  async getBuildings() {
    return this.prisma.building.findMany({
      include: { district: { include: { planet: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // Planet CRUD
  async createPlanet(data: AdminPlanetInput) {
    this.validatePlanetInput(data);
    const solar = await this.prisma.solarSystem.findUnique({ where: { id: data.solarSystemId } });
    if (!solar) throw new BadRequestException(`Solar system ${data.solarSystemId} not found`);
    return this.prisma.planet.create({
      data: {
        solarSystemId: data.solarSystemId,
        name: data.name,
        description: data.description ?? null,
        planetType: data.planetType ?? 'TERRESTRIAL',
        dangerLevel: data.dangerLevel ?? 1,
        lawLevel: data.lawLevel ?? 5,
        economyLevel: data.economyLevel ?? 5,
      },
    });
  }

  async updatePlanet(id: string, data: Partial<AdminPlanetInput>) {
    await this.getPlanetById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.planet.update({
      where: { id },
      data: {
        ...(data.solarSystemId !== undefined ? { solarSystemId: data.solarSystemId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.planetType !== undefined ? { planetType: data.planetType } : {}),
        ...(data.dangerLevel !== undefined ? { dangerLevel: data.dangerLevel } : {}),
        ...(data.lawLevel !== undefined ? { lawLevel: data.lawLevel } : {}),
        ...(data.economyLevel !== undefined ? { economyLevel: data.economyLevel } : {}),
      },
    });
  }

  async deletePlanet(id: string) {
    await this.getPlanetById(id);
    const districts = await this.prisma.district.count({ where: { planetId: id } });
    if (districts > 0) {
      throw new BadRequestException(
        `Cannot delete planet: ${districts} district(s) still attached. Delete them first.`,
      );
    }
    const characters = await this.prisma.character.count({ where: { currentPlanetId: id } });
    if (characters > 0) {
      throw new BadRequestException(
        `Cannot delete planet: ${characters} character(s) still located there.`,
      );
    }
    await this.prisma.planet.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validatePlanetInput(input: AdminPlanetInput) {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('Planet name must be at least 2 characters');
    }
    if (!input.solarSystemId) {
      throw new BadRequestException('solarSystemId is required');
    }
    if (input.planetType && !PLANET_TYPES.includes(input.planetType)) {
      throw new BadRequestException(`planetType must be one of ${PLANET_TYPES.join(', ')}`);
    }
    this.validateLevel('dangerLevel', input.dangerLevel);
    this.validateLevel('lawLevel', input.lawLevel);
    this.validateLevel('economyLevel', input.economyLevel);
  }

  // District CRUD
  async createDistrict(data: AdminDistrictInput) {
    this.validateDistrictInput(data);
    const planet = await this.prisma.planet.findUnique({ where: { id: data.planetId } });
    if (!planet) throw new BadRequestException(`Planet ${data.planetId} not found`);
    if (data.controllingFactionId) {
      const faction = await this.prisma.faction.findUnique({
        where: { id: data.controllingFactionId },
      });
      if (!faction)
        throw new BadRequestException(`Faction ${data.controllingFactionId} not found`);
    }
    return this.prisma.district.create({
      data: {
        planetId: data.planetId,
        name: data.name,
        description: data.description ?? null,
        controllingFactionId: data.controllingFactionId ?? null,
        dangerLevel: data.dangerLevel ?? 1,
        lawLevel: data.lawLevel ?? 5,
        economyLevel: data.economyLevel ?? 5,
      },
    });
  }

  async updateDistrict(id: string, data: Partial<AdminDistrictInput>) {
    await this.getDistrictById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.controllingFactionId) {
      const faction = await this.prisma.faction.findUnique({
        where: { id: data.controllingFactionId },
      });
      if (!faction)
        throw new BadRequestException(`Faction ${data.controllingFactionId} not found`);
    }
    return this.prisma.district.update({
      where: { id },
      data: {
        ...(data.planetId !== undefined ? { planetId: data.planetId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.controllingFactionId !== undefined
          ? { controllingFactionId: data.controllingFactionId }
          : {}),
        ...(data.dangerLevel !== undefined ? { dangerLevel: data.dangerLevel } : {}),
        ...(data.lawLevel !== undefined ? { lawLevel: data.lawLevel } : {}),
        ...(data.economyLevel !== undefined ? { economyLevel: data.economyLevel } : {}),
      },
    });
  }

  async deleteDistrict(id: string) {
    await this.getDistrictById(id);
    const buildings = await this.prisma.building.count({ where: { districtId: id } });
    if (buildings > 0) {
      throw new BadRequestException(
        `Cannot delete district: ${buildings} building(s) still attached.`,
      );
    }
    const characters = await this.prisma.character.count({ where: { currentDistrictId: id } });
    if (characters > 0) {
      throw new BadRequestException(
        `Cannot delete district: ${characters} character(s) still located there.`,
      );
    }
    await this.prisma.district.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validateDistrictInput(input: AdminDistrictInput) {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('District name must be at least 2 characters');
    }
    if (!input.planetId) {
      throw new BadRequestException('planetId is required');
    }
    this.validateLevel('dangerLevel', input.dangerLevel);
    this.validateLevel('lawLevel', input.lawLevel);
    this.validateLevel('economyLevel', input.economyLevel);
  }

  // Building CRUD
  async createBuilding(data: AdminBuildingInput) {
    this.validateBuildingInput(data);
    const district = await this.prisma.district.findUnique({ where: { id: data.districtId } });
    if (!district) throw new BadRequestException(`District ${data.districtId} not found`);
    return this.prisma.building.create({
      data: {
        districtId: data.districtId,
        name: data.name,
        description: data.description ?? null,
        ownerType: data.ownerType ?? 'SYSTEM',
        ownerId: data.ownerId ?? null,
        functionality: (data.functionality ?? []) as never,
        status: data.status ?? 'OPEN',
      },
    });
  }

  async updateBuilding(id: string, data: Partial<AdminBuildingInput>) {
    await this.getBuildingById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.functionality !== undefined) {
      for (const fn of data.functionality) {
        if (!BUILDING_FUNCTIONS.includes(fn)) {
          throw new BadRequestException(
            `Invalid building function ${fn}. Valid: ${BUILDING_FUNCTIONS.join(', ')}`,
          );
        }
      }
    }
    return this.prisma.building.update({
      where: { id },
      data: {
        ...(data.districtId !== undefined ? { districtId: data.districtId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.ownerType !== undefined ? { ownerType: data.ownerType } : {}),
        ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
        ...(data.functionality !== undefined
          ? { functionality: data.functionality as never }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async deleteBuilding(id: string) {
    await this.getBuildingById(id);
    const characters = await this.prisma.character.count({ where: { currentBuildingId: id } });
    if (characters > 0) {
      throw new BadRequestException(
        `Cannot delete building: ${characters} character(s) still inside.`,
      );
    }
    const factionHQ = await this.prisma.faction.count({ where: { headquartersBuildingId: id } });
    if (factionHQ > 0) {
      throw new BadRequestException(
        `Cannot delete building: ${factionHQ} faction(s) use it as HQ.`,
      );
    }
    const corpHQ = await this.prisma.corporation.count({
      where: { headquartersBuildingId: id },
    });
    if (corpHQ > 0) {
      throw new BadRequestException(
        `Cannot delete building: ${corpHQ} corporation(s) use it as HQ.`,
      );
    }
    await this.prisma.itemInstance.deleteMany({ where: { ownerType: 'BUILDING', ownerId: id } });
    await this.prisma.building.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validateBuildingInput(input: AdminBuildingInput) {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('Building name must be at least 2 characters');
    }
    if (!input.districtId) {
      throw new BadRequestException('districtId is required');
    }
    if (input.ownerType && !BUILDING_OWNER_TYPES.includes(input.ownerType)) {
      throw new BadRequestException(`ownerType must be one of ${BUILDING_OWNER_TYPES.join(', ')}`);
    }
    if (input.status && !BUILDING_STATUSES.includes(input.status)) {
      throw new BadRequestException(`status must be one of ${BUILDING_STATUSES.join(', ')}`);
    }
    if (input.functionality) {
      for (const fn of input.functionality) {
        if (!BUILDING_FUNCTIONS.includes(fn)) {
          throw new BadRequestException(
            `Invalid building function ${fn}. Valid: ${BUILDING_FUNCTIONS.join(', ')}`,
          );
        }
      }
    }
  }

  private validateLevel(field: string, value: number | undefined) {
    if (value === undefined) return;
    if (value < 0 || value > 10) {
      throw new BadRequestException(`${field} must be between 0 and 10`);
    }
  }
}
