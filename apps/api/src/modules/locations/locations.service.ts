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

type MapTileLayer = 'TERRAIN' | 'ROAD' | 'PROP';
type TerrainVariant = 'GRASS' | 'DIRT' | 'WATER';
type RoadVariant = 'ROAD_STRAIGHT' | 'ROAD_CORNER' | 'ROAD_T' | 'ROAD_CROSS';
type PropVariant = 'TREE' | 'LAMP' | 'FENCE' | 'FOUNTAIN';
type MapTileType = TerrainVariant | RoadVariant | PropVariant;

export interface MapTile {
  x: number;
  y: number;
  layer: MapTileLayer;
  type: MapTileType;
  rotation?: 0 | 90 | 180 | 270;
}

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
  mapWidth?: number;
  mapHeight?: number;
}

export interface AdminDistrictMapInput {
  width: number;
  height: number;
  tiles: MapTile[];
}

export interface AdminBuildingInput {
  districtId: string;
  name: string;
  description?: string | null;
  ownerType?: BuildingOwnerType;
  ownerId?: string | null;
  functionality?: BuildingFunction[];
  status?: BuildingStatus;
  gridX?: number | null;
  gridY?: number | null;
  gridWidth?: number;
  gridHeight?: number;
  gridZ?: number;
}

const BUILDING_SIZE_MIN = 1;
const BUILDING_SIZE_MAX = 16;
const BUILDING_Z_MIN = 0.1;
const BUILDING_Z_MAX = 6;

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

const MAP_TILE_LAYERS: MapTileLayer[] = ['TERRAIN', 'ROAD', 'PROP'];
const TERRAIN_VARIANTS: TerrainVariant[] = ['GRASS', 'DIRT', 'WATER'];
const ROAD_VARIANTS: RoadVariant[] = ['ROAD_STRAIGHT', 'ROAD_CORNER', 'ROAD_T', 'ROAD_CROSS'];
const PROP_VARIANTS: PropVariant[] = ['TREE', 'LAMP', 'FENCE', 'FOUNTAIN'];
const MAP_DIMENSION_MIN = 1;
const MAP_DIMENSION_MAX = 64;

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
        ...(data.mapWidth !== undefined ? { mapWidth: data.mapWidth } : {}),
        ...(data.mapHeight !== undefined ? { mapHeight: data.mapHeight } : {}),
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
        ...(data.mapWidth !== undefined ? { mapWidth: data.mapWidth } : {}),
        ...(data.mapHeight !== undefined ? { mapHeight: data.mapHeight } : {}),
      },
    });
  }

  async updateDistrictMap(id: string, input: AdminDistrictMapInput) {
    const district = await this.getDistrictById(id);
    this.validateMapDimension('width', input.width);
    this.validateMapDimension('height', input.height);
    if (!Array.isArray(input.tiles)) {
      throw new BadRequestException('tiles must be an array');
    }
    const seen = new Set<string>();
    for (const tile of input.tiles) {
      this.validateMapTile(tile, input.width, input.height);
      const key = `${tile.x},${tile.y},${tile.layer}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate tile at (${tile.x},${tile.y}) on layer ${tile.layer}`,
        );
      }
      seen.add(key);
    }
    const orphanedBuildings = district.buildings.filter(
      (b) =>
        b.gridX != null &&
        b.gridY != null &&
        (b.gridX + (b.gridWidth ?? 1) > input.width ||
          b.gridY + (b.gridHeight ?? 1) > input.height),
    );
    if (orphanedBuildings.length > 0) {
      throw new BadRequestException(
        `Cannot resize: ${orphanedBuildings.length} placed building(s) would fall outside the new bounds. Move them first.`,
      );
    }
    return this.prisma.district.update({
      where: { id },
      data: {
        mapWidth: input.width,
        mapHeight: input.height,
        mapTiles: input.tiles as never,
      },
      include: { planet: true, buildings: true, controllingFaction: true },
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
    if (input.mapWidth !== undefined) this.validateMapDimension('mapWidth', input.mapWidth);
    if (input.mapHeight !== undefined) this.validateMapDimension('mapHeight', input.mapHeight);
  }

  private validateMapDimension(field: string, value: number) {
    if (!Number.isInteger(value) || value < MAP_DIMENSION_MIN || value > MAP_DIMENSION_MAX) {
      throw new BadRequestException(
        `${field} must be an integer between ${MAP_DIMENSION_MIN} and ${MAP_DIMENSION_MAX}`,
      );
    }
  }

  private validateMapTile(tile: MapTile, width: number, height: number) {
    if (!tile || typeof tile !== 'object') {
      throw new BadRequestException('Each tile must be an object');
    }
    if (!Number.isInteger(tile.x) || tile.x < 0 || tile.x >= width) {
      throw new BadRequestException(`tile.x out of bounds (0..${width - 1}): ${tile.x}`);
    }
    if (!Number.isInteger(tile.y) || tile.y < 0 || tile.y >= height) {
      throw new BadRequestException(`tile.y out of bounds (0..${height - 1}): ${tile.y}`);
    }
    if (!MAP_TILE_LAYERS.includes(tile.layer)) {
      throw new BadRequestException(
        `tile.layer must be one of ${MAP_TILE_LAYERS.join(', ')}`,
      );
    }
    const allowedTypes =
      tile.layer === 'TERRAIN'
        ? TERRAIN_VARIANTS
        : tile.layer === 'ROAD'
          ? ROAD_VARIANTS
          : PROP_VARIANTS;
    if (!(allowedTypes as string[]).includes(tile.type)) {
      throw new BadRequestException(
        `tile.type for layer ${tile.layer} must be one of ${allowedTypes.join(', ')}`,
      );
    }
    if (tile.rotation !== undefined && ![0, 90, 180, 270].includes(tile.rotation)) {
      throw new BadRequestException('tile.rotation must be 0, 90, 180, or 270');
    }
  }

  private validateBuildingSize(gridWidth?: number, gridHeight?: number, gridZ?: number) {
    if (gridWidth !== undefined) {
      if (
        !Number.isInteger(gridWidth) ||
        gridWidth < BUILDING_SIZE_MIN ||
        gridWidth > BUILDING_SIZE_MAX
      ) {
        throw new BadRequestException(
          `gridWidth must be an integer between ${BUILDING_SIZE_MIN} and ${BUILDING_SIZE_MAX}`,
        );
      }
    }
    if (gridHeight !== undefined) {
      if (
        !Number.isInteger(gridHeight) ||
        gridHeight < BUILDING_SIZE_MIN ||
        gridHeight > BUILDING_SIZE_MAX
      ) {
        throw new BadRequestException(
          `gridHeight must be an integer between ${BUILDING_SIZE_MIN} and ${BUILDING_SIZE_MAX}`,
        );
      }
    }
    if (gridZ !== undefined) {
      if (typeof gridZ !== 'number' || gridZ < BUILDING_Z_MIN || gridZ > BUILDING_Z_MAX) {
        throw new BadRequestException(
          `gridZ must be a number between ${BUILDING_Z_MIN} and ${BUILDING_Z_MAX}`,
        );
      }
    }
  }

  private async validateBuildingPlacement(
    districtId: string,
    gridX: number | null | undefined,
    gridY: number | null | undefined,
    gridWidth: number,
    gridHeight: number,
    excludeBuildingId?: string,
  ) {
    const xProvided = gridX !== undefined && gridX !== null;
    const yProvided = gridY !== undefined && gridY !== null;
    if (xProvided !== yProvided) {
      throw new BadRequestException('gridX and gridY must both be set or both be null');
    }
    if (!xProvided) return;
    if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) {
      throw new BadRequestException('gridX and gridY must be integers');
    }
    const district = await this.prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new BadRequestException(`District ${districtId} not found`);
    if (gridX! < 0 || gridX! + gridWidth > district.mapWidth) {
      throw new BadRequestException(
        `Footprint out of bounds: x=${gridX} width=${gridWidth} exceeds map width ${district.mapWidth}`,
      );
    }
    if (gridY! < 0 || gridY! + gridHeight > district.mapHeight) {
      throw new BadRequestException(
        `Footprint out of bounds: y=${gridY} height=${gridHeight} exceeds map height ${district.mapHeight}`,
      );
    }
    const others = await this.prisma.building.findMany({
      where: {
        districtId,
        gridX: { not: null },
        gridY: { not: null },
        ...(excludeBuildingId ? { id: { not: excludeBuildingId } } : {}),
      },
    });
    for (const o of others) {
      const ox = o.gridX as number;
      const oy = o.gridY as number;
      const ow = o.gridWidth ?? 1;
      const oh = o.gridHeight ?? 1;
      const overlapsX = gridX! < ox + ow && ox < gridX! + gridWidth;
      const overlapsY = gridY! < oy + oh && oy < gridY! + gridHeight;
      if (overlapsX && overlapsY) {
        throw new BadRequestException(
          `Footprint overlaps with ${o.name} at (${ox},${oy}) size ${ow}×${oh}`,
        );
      }
    }
  }

  // Building CRUD
  async createBuilding(data: AdminBuildingInput) {
    this.validateBuildingInput(data);
    this.validateBuildingSize(data.gridWidth, data.gridHeight, data.gridZ);
    const district = await this.prisma.district.findUnique({ where: { id: data.districtId } });
    if (!district) throw new BadRequestException(`District ${data.districtId} not found`);
    const w = data.gridWidth ?? 1;
    const h = data.gridHeight ?? 1;
    await this.validateBuildingPlacement(data.districtId, data.gridX, data.gridY, w, h);
    return this.prisma.building.create({
      data: {
        districtId: data.districtId,
        name: data.name,
        description: data.description ?? null,
        ownerType: data.ownerType ?? 'SYSTEM',
        ownerId: data.ownerId ?? null,
        functionality: (data.functionality ?? []) as never,
        status: data.status ?? 'OPEN',
        gridX: data.gridX ?? null,
        gridY: data.gridY ?? null,
        gridWidth: w,
        gridHeight: h,
        gridZ: data.gridZ ?? 1.4,
      },
    });
  }

  async updateBuilding(id: string, data: Partial<AdminBuildingInput>) {
    const existing = await this.getBuildingById(id);
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
    this.validateBuildingSize(data.gridWidth, data.gridHeight, data.gridZ);
    const placementTouched =
      data.gridX !== undefined ||
      data.gridY !== undefined ||
      data.gridWidth !== undefined ||
      data.gridHeight !== undefined ||
      data.districtId !== undefined;
    if (placementTouched) {
      const targetDistrictId = data.districtId ?? existing.districtId;
      const nextX = data.gridX !== undefined ? data.gridX : existing.gridX;
      const nextY = data.gridY !== undefined ? data.gridY : existing.gridY;
      const nextW = data.gridWidth !== undefined ? data.gridWidth : existing.gridWidth;
      const nextH = data.gridHeight !== undefined ? data.gridHeight : existing.gridHeight;
      await this.validateBuildingPlacement(targetDistrictId, nextX, nextY, nextW, nextH, id);
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
        ...(data.gridX !== undefined ? { gridX: data.gridX } : {}),
        ...(data.gridY !== undefined ? { gridY: data.gridY } : {}),
        ...(data.gridWidth !== undefined ? { gridWidth: data.gridWidth } : {}),
        ...(data.gridHeight !== undefined ? { gridHeight: data.gridHeight } : {}),
        ...(data.gridZ !== undefined ? { gridZ: data.gridZ } : {}),
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
