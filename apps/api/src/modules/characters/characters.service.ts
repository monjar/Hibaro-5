import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assessTravel } from './travel.utils';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
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
    return character;
  }

  async getSummary(id: string) {
    const character = await this.findById(id);
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

  async getRelationships(id: string) {
    return this.prisma.relationship.findMany({
      where: { sourceType: 'CHARACTER', sourceId: id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getInventory(id: string) {
    return this.prisma.itemInstance.findMany({
      where: { ownerType: 'CHARACTER', ownerId: id },
      include: { itemDefinition: true },
    });
  }

  async getLocation(id: string) {
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

  async travel(id: string, dto: { planetId?: string; districtId?: string; buildingId?: string }) {
    const character = await this.findById(id);
    const destinationPlanetId = dto.planetId ?? character.currentPlanetId;
    const destinationDistrictId = dto.districtId ?? character.currentDistrictId;
    const destinationBuildingId = dto.buildingId ?? character.currentBuildingId;

    if (!destinationPlanetId || !destinationDistrictId) {
      throw new BadRequestException('Travel requires a destination planet and district');
    }

    const [destinationPlanet, destinationDistrict, destinationBuilding] = await Promise.all([
      this.prisma.planet.findUnique({ where: { id: destinationPlanetId } }),
      this.prisma.district.findUnique({
        where: { id: destinationDistrictId },
        include: { planet: true, controllingFaction: true },
      }),
      destinationBuildingId
        ? this.prisma.building.findUnique({ where: { id: destinationBuildingId } })
        : Promise.resolve(null),
    ]);

    if (!destinationPlanet) throw new NotFoundException('Planet not found');
    if (!destinationDistrict) throw new NotFoundException('District not found');
    if (destinationDistrict.planetId !== destinationPlanet.id) {
      throw new BadRequestException('District does not belong to the requested planet');
    }

    // Basic validation: if building, it must be in the district
    if (destinationBuilding) {
      if (destinationBuilding.districtId !== destinationDistrict.id) {
        throw new BadRequestException('Building does not belong to the requested district');
      }
      if (
        destinationBuilding.status === 'LOCKED_DOWN' ||
        destinationBuilding.status === 'ABANDONED'
      ) {
        throw new BadRequestException(`Building is ${destinationBuilding.status}`);
      }
    }

    const travel = assessTravel({
      samePlanet: character.currentPlanetId === destinationPlanet.id,
      sameDistrict: character.currentDistrictId === destinationDistrict.id,
      destinationPlanetDanger: destinationPlanet.dangerLevel,
      destinationPlanetLaw: destinationPlanet.lawLevel,
      destinationDistrictDanger: destinationDistrict.dangerLevel,
      destinationDistrictLaw: destinationDistrict.lawLevel,
      destinationDistrictEconomy: destinationDistrict.economyLevel,
      currentDistrictDanger: character.currentDistrict?.dangerLevel,
    });

    if (character.credits < travel.travelCost) {
      throw new BadRequestException(
        `Travel requires ${travel.travelCost} credits (current: ${character.credits})`,
      );
    }

    const updated = await this.prisma.character.update({
      where: { id },
      data: {
        credits: character.credits - travel.travelCost,
        energy: Math.max(0, character.energy + travel.travelEnergyDelta),
        wantedLevel: Math.max(0, character.wantedLevel + travel.wantedDelta),
        currentPlanetId: destinationPlanet.id,
        currentDistrictId: destinationDistrict.id,
        currentBuildingId: destinationBuilding?.id ?? destinationBuildingId ?? null,
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
          message: `${character.name} traveled to ${destinationDistrict.name} on ${destinationPlanet.name}`,
          relatedEntities: {
            destination: {
              planetId: destinationPlanet.id,
              districtId: destinationDistrict.id,
              buildingId: destinationBuilding?.id ?? null,
            },
            travel: { ...travel },
            controllingFaction: destinationDistrict.controllingFaction?.name ?? null,
          } as unknown as Prisma.JsonObject,
        },
      });
    }

    return {
      character: updated,
      travel: {
        ...travel,
        destination: {
          planetId: destinationPlanet.id,
          planetName: destinationPlanet.name,
          districtId: destinationDistrict.id,
          districtName: destinationDistrict.name,
          buildingId: destinationBuilding?.id ?? null,
          buildingName: destinationBuilding?.name ?? null,
        },
      },
    };
  }
}
