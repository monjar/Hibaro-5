import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, playerId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: {
        player: true,
        currentPlanet: true,
        currentDistrict: true,
        currentBuilding: true,
      },
    });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only access your own character');
    }

    if (!character.player) {
      return character;
    }

    const { passwordHash, ...safePlayer } = character.player;
    void passwordHash;
    return { ...character, player: safePlayer };
  }

  async getSummary(id: string, playerId: string) {
    const character = await this.findById(id, playerId);
    const memberships = await this.prisma.factionMembership.findMany({
      where: { characterId: id },
      include: { faction: true },
    });
    const employments = await this.prisma.corporationEmployment.findMany({
      where: { characterId: id },
      include: { corporation: true },
    });
    const recentActivity = await this.prisma.activityLog.findMany({
      where: { characterId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return { character, memberships, employments, recentActivity };
  }

  async getRelationships(id: string, playerId: string) {
    await this.findById(id, playerId);
    return this.prisma.relationship.findMany({
      where: { sourceType: 'CHARACTER', sourceId: id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getInventory(id: string, playerId: string) {
    await this.findById(id, playerId);
    return this.prisma.itemInstance.findMany({
      where: { ownerType: 'CHARACTER', ownerId: id },
      include: { itemDefinition: true },
    });
  }

  async getLocation(id: string, playerId: string) {
    await this.findById(id, playerId);
    const character = await this.prisma.character.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        currentPlanet: { select: { id: true, name: true, planetType: true } },
        currentDistrict: { select: { id: true, name: true, dangerLevel: true } },
        currentBuilding: { select: { id: true, name: true, functionality: true, status: true } },
      },
    });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    return character;
  }

  async travel(
    id: string,
    playerId: string,
    dto: { planetId?: string; districtId?: string; buildingId?: string },
  ) {
    const character = await this.findById(id, playerId);

    // Basic validation: if building, it must be in the district
    if (dto.buildingId) {
      const building = await this.prisma.building.findUnique({ where: { id: dto.buildingId } });
      if (!building) throw new NotFoundException('Building not found');
      if (building.status === 'LOCKED_DOWN' || building.status === 'ABANDONED') {
        throw new BadRequestException(`Building is ${building.status}`);
      }
    }

    const updated = await this.prisma.character.update({
      where: { id },
      data: {
        currentPlanetId: dto.planetId ?? character.currentPlanetId,
        currentDistrictId: dto.districtId ?? character.currentDistrictId,
        currentBuildingId: dto.buildingId ?? character.currentBuildingId,
      },
      include: { currentPlanet: true, currentDistrict: true, currentBuilding: true },
    });

    // Log travel
    if (character.playerId) {
      await this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId: id,
          type: 'LOCATION_CHANGED',
          message: `${character.name} traveled to a new location`,
          relatedEntities: dto,
        },
      });
    }

    return updated;
  }
}
