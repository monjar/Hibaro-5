import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assessTravel } from './travel.utils';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  private async getTravelStandingAdjustment(
    characterId: string,
    district: {
      name: string;
      controllingFactionId?: string | null;
      controllingFaction?: { name: string } | null;
    },
  ) {
    if (!district.controllingFactionId) {
      return {
        blocked: false,
        travelSurcharge: 0,
        controllingFactionName: null,
        reputationScore: 0,
        reputationModifier: 'NEUTRAL' as const,
        warnings: [] as string[],
      };
    }

    const relationship = await this.prisma.relationship.findFirst({
      where: {
        sourceType: 'CHARACTER',
        sourceId: characterId,
        targetType: 'FACTION',
        targetId: district.controllingFactionId,
        relationshipType: 'REPUTATION',
      },
    });

    const reputationScore = Math.round(relationship?.value ?? 0);
    const controllingFactionName = district.controllingFaction?.name ?? null;

    if (reputationScore <= -20) {
      return {
        blocked: true,
        travelSurcharge: 0,
        controllingFactionName,
        reputationScore,
        reputationModifier: 'LOCKED' as const,
        warnings: [
          `${controllingFactionName ?? 'District security'} refuses entry at your current standing.`,
        ],
      };
    }

    if (reputationScore < 0) {
      return {
        blocked: false,
        travelSurcharge: Math.max(10, Math.abs(reputationScore) * 2),
        controllingFactionName,
        reputationScore,
        reputationModifier: 'SURCHARGE' as const,
        warnings: [
          `${controllingFactionName ?? 'District security'} will charge a hostile-standing access fee.`,
        ],
      };
    }

    if (reputationScore >= 25) {
      return {
        blocked: false,
        travelSurcharge: 0,
        controllingFactionName,
        reputationScore,
        reputationModifier: 'PRIVILEGED' as const,
        warnings: [
          `${controllingFactionName ?? 'District security'} recognises you as trusted local traffic.`,
        ],
      };
    }

    return {
      blocked: false,
      travelSurcharge: 0,
      controllingFactionName,
      reputationScore,
      reputationModifier: 'NEUTRAL' as const,
      warnings: controllingFactionName
        ? [`${controllingFactionName} controls this district.`]
        : [],
    };
  }

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

    const safePlayer: Partial<typeof character.player> = { ...character.player };
    delete safePlayer.passwordHash;
    return { ...character, player: safePlayer as Omit<typeof character.player, 'passwordHash'> };
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

  async travelQuote(
    id: string,
    playerId: string,
    dto: { planetId?: string; districtId?: string; buildingId?: string },
  ) {
    const character = await this.findById(id, playerId);
    const destinationPlanetId = dto.planetId ?? character.currentPlanetId;
    const destinationDistrictId = dto.districtId ?? character.currentDistrictId;

    if (!destinationPlanetId || !destinationDistrictId) {
      throw new BadRequestException('Travel quote requires a destination planet and district');
    }

    const [destinationPlanet, destinationDistrict] = await Promise.all([
      this.prisma.planet.findUnique({ where: { id: destinationPlanetId } }),
      this.prisma.district.findUnique({
        where: { id: destinationDistrictId },
        include: { planet: true, controllingFaction: true },
      }),
    ]);
    if (!destinationPlanet) throw new NotFoundException('Planet not found');
    if (!destinationDistrict) throw new NotFoundException('District not found');
    if (destinationDistrict.planetId !== destinationPlanet.id) {
      throw new BadRequestException('District does not belong to the requested planet');
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

    const standing = await this.getTravelStandingAdjustment(id, destinationDistrict);
    const travelCost = travel.travelCost + standing.travelSurcharge;

    return {
      ...travel,
      travelCost,
      travelSurcharge: standing.travelSurcharge,
      blocked: standing.blocked,
      destination: {
        planetId: destinationPlanet.id,
        planetName: destinationPlanet.name,
        districtId: destinationDistrict.id,
        districtName: destinationDistrict.name,
        buildingId: dto.buildingId ?? null,
      },
      affordable: !standing.blocked && character.credits >= travelCost,
      currentCredits: character.credits,
      controllingFactionName: standing.controllingFactionName,
      reputationScore: standing.reputationScore,
      reputationModifier: standing.reputationModifier,
      warnings: standing.warnings,
    };
  }

  async rest(id: string, playerId: string) {
    const character = await this.findById(id, playerId);

    const building = character.currentBuildingId
      ? await this.prisma.building.findUnique({ where: { id: character.currentBuildingId } })
      : null;
    if (!building) {
      throw new BadRequestException('You must be inside a building to rest');
    }
    const fnArr = Array.isArray(building.functionality) ? (building.functionality as string[]) : [];
    const isSafe = fnArr.includes('SAFEHOUSE') || fnArr.includes('CLINIC') || fnArr.includes('HUB');
    if (!isSafe) {
      throw new BadRequestException(
        `${building.name} is not somewhere you can rest (need a safehouse, clinic, or hub)`,
      );
    }

    const isClinic = fnArr.includes('CLINIC');
    const isSafehouse = fnArr.includes('SAFEHOUSE');

    const energyRecover = isSafehouse ? 60 : isClinic ? 30 : 25;
    const healthRecover = isClinic ? 60 : isSafehouse ? 25 : 10;
    const cost = isClinic ? 80 : isSafehouse ? 30 : 15;

    if (character.credits < cost) {
      throw new BadRequestException(
        `Resting here costs ${cost} credits (you have ${character.credits})`,
      );
    }

    const newEnergy = Math.min(character.maxEnergy, character.energy + energyRecover);
    const newHealth = Math.min(character.maxHealth, character.health + healthRecover);
    const newWanted = isSafehouse
      ? Math.max(0, character.wantedLevel - 1)
      : character.wantedLevel;

    const updated = await this.prisma.character.update({
      where: { id },
      data: {
        credits: character.credits - cost,
        energy: newEnergy,
        health: newHealth,
        wantedLevel: newWanted,
      },
      include: { currentPlanet: true, currentDistrict: true, currentBuilding: true },
    });

    if (character.playerId) {
      await this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId: id,
          type: 'BUILDING_ENTERED',
          message: `${character.name} rested at ${building.name} (+${newEnergy - character.energy} EN, +${newHealth - character.health} HP)`,
          relatedEntities: {
            buildingId: building.id,
            energyDelta: newEnergy - character.energy,
            healthDelta: newHealth - character.health,
            cost,
            wantedDelta: newWanted - character.wantedLevel,
          },
        },
      });
    }

    return {
      character: updated,
      restedAt: building.name,
      energyRecovered: newEnergy - character.energy,
      healthRecovered: newHealth - character.health,
      cost,
      wantedDelta: newWanted - character.wantedLevel,
    };
  }

  async useItem(id: string, playerId: string, itemInstanceId: string) {
    const character = await this.findById(id, playerId);

    const item = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { itemDefinition: true },
    });
    if (!item) throw new NotFoundException(`Item ${itemInstanceId} not found`);
    if (item.ownerType !== 'CHARACTER' || item.ownerId !== id) {
      throw new BadRequestException('You do not own this item');
    }
    if (item.itemDefinition.category !== 'CONSUMABLE') {
      throw new BadRequestException('Only consumables can be used');
    }

    const effects = (item.itemDefinition.effects as Array<Record<string, unknown>>) ?? [];
    if (!Array.isArray(effects) || effects.length === 0) {
      throw new BadRequestException('Item has no effects');
    }

    const updates: Record<string, number> = {};
    const applied: Array<{ stat: string; value: number }> = [];

    for (const effect of effects) {
      if (effect.type === 'MODIFY_STAT' && typeof effect.key === 'string') {
        const key = effect.key;
        const value = typeof effect.value === 'number' ? effect.value : 0;
        if (key === 'health') {
          updates.health = Math.min(
            character.maxHealth,
            Math.max(0, character.health + value),
          );
          applied.push({ stat: 'health', value });
        } else if (key === 'energy') {
          updates.energy = Math.min(
            character.maxEnergy,
            Math.max(0, character.energy + value),
          );
          applied.push({ stat: 'energy', value });
        } else if (key === 'wantedLevel') {
          updates.wantedLevel = Math.max(0, character.wantedLevel + value);
          applied.push({ stat: 'wantedLevel', value });
        }
      }
    }

    await this.prisma.$transaction([
      this.prisma.character.update({ where: { id }, data: updates }),
      this.prisma.itemInstance.delete({ where: { id: item.id } }),
      ...(character.playerId
        ? [
            this.prisma.activityLog.create({
              data: {
                playerId: character.playerId,
                characterId: id,
                type: 'ITEM_BOUGHT',
                message: `${character.name} used ${item.itemDefinition.name}`,
                relatedEntities: {
                  itemId: item.id,
                  itemName: item.itemDefinition.name,
                  applied,
                } as unknown as Prisma.JsonObject,
              },
            }),
          ]
        : []),
    ]);

    return {
      success: true,
      itemUsed: item.itemDefinition.name,
      applied,
    };
  }

  async travel(
    id: string,
    playerId: string,
    dto: { planetId?: string; districtId?: string; buildingId?: string },
  ) {
    const character = await this.findById(id, playerId);
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

    const standing = await this.getTravelStandingAdjustment(id, destinationDistrict);
    if (standing.blocked) {
      throw new BadRequestException(standing.warnings[0] ?? 'Travel is blocked by local control');
    }

    const travelCost = travel.travelCost + standing.travelSurcharge;

    if (character.credits < travelCost) {
      throw new BadRequestException(
        `Travel requires ${travelCost} credits (current: ${character.credits})`,
      );
    }

    const updated = await this.prisma.character.update({
      where: { id },
      data: {
        credits: character.credits - travelCost,
        energy: Math.max(0, character.energy + travel.travelEnergyDelta),
        wantedLevel: Math.max(0, character.wantedLevel + travel.wantedDelta),
        currentPlanetId: destinationPlanet.id,
        currentDistrictId: destinationDistrict.id,
        currentBuildingId: destinationBuilding?.id ?? destinationBuildingId ?? null,
      },
      include: { currentPlanet: true, currentDistrict: true, currentBuilding: true },
    });

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
            travel: {
              ...travel,
              travelCost,
              travelSurcharge: standing.travelSurcharge,
              blocked: false,
              controllingFactionName: standing.controllingFactionName,
              reputationScore: standing.reputationScore,
              reputationModifier: standing.reputationModifier,
              warnings: standing.warnings,
            },
            controllingFaction: destinationDistrict.controllingFaction?.name ?? null,
          } as unknown as Prisma.JsonObject,
        },
      });
    }

    return {
      character: updated,
      travel: {
        ...travel,
        travelCost,
        travelSurcharge: standing.travelSurcharge,
        blocked: false,
        controllingFactionName: standing.controllingFactionName,
        reputationScore: standing.reputationScore,
        reputationModifier: standing.reputationModifier,
        warnings: standing.warnings,
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
