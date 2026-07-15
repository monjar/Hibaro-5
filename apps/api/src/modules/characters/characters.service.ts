import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  MAX_LEVEL,
  STAT_CAP,
  aggregateEquipmentBonuses,
  calculateDailyRent,
  slotForCategory,
  xpThresholdForLevel,
  xpToNextLevel,
} from '@heliora/game-rules';
import { PrismaService } from '../../prisma/prisma.service';
import { assessTravel } from './travel.utils';
import { OpportunitiesService, REST_OPPORTUNITY_ID } from '../opportunities/opportunities.service';

const ALLOCATABLE_STATS = [
  'strength',
  'agility',
  'intelligence',
  'charisma',
  'hacking',
  'combat',
  'stealth',
  'engineering',
] as const;

type AllocatableStat = (typeof ALLOCATABLE_STATS)[number];

@Injectable()
export class CharactersService {
  constructor(
    private prisma: PrismaService,
    private opportunitiesService: OpportunitiesService,
  ) {}

  private async getActiveTravelBlock(characterId: string) {
    const activeOpportunity = await this.prisma.opportunityInstance.findFirst({
      where: {
        characterId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
      },
      include: {
        definition: {
          select: {
            title: true,
            kind: true,
          },
        },
      },
    });

    if (!activeOpportunity) {
      return null;
    }

    if (activeOpportunity.definitionId === REST_OPPORTUNITY_ID) {
      return null;
    }

    const activityLabel =
      activeOpportunity.definition.kind === 'JOB'
        ? 'job'
        : activeOpportunity.definition.kind === 'GIG'
          ? 'gig'
          : 'assignment';

    return {
      blocked: true,
      warning: `Finish your current ${activityLabel}, ${activeOpportunity.definition.title}, before travelling.`,
    } as const;
  }

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

    const progression = this.buildProgressionView(character.xp, character.level);
    const equipment = await this.buildEquipmentView(character.id);

    if (!character.player) {
      return { ...character, progression, equipment };
    }

    const safePlayer: Partial<typeof character.player> = { ...character.player };
    delete safePlayer.passwordHash;
    return {
      ...character,
      progression,
      equipment,
      player: safePlayer as Omit<typeof character.player, 'passwordHash'>,
    };
  }

  private async buildEquipmentView(characterId: string) {
    const equipped = await this.prisma.itemInstance.findMany({
      where: { ownerType: 'CHARACTER', ownerId: characterId, equippedSlot: { not: null } },
      include: { itemDefinition: true },
    });
    return {
      items: equipped.map((item) => ({
        itemInstanceId: item.id,
        slot: item.equippedSlot,
        name: item.itemDefinition.name,
        category: item.itemDefinition.category,
        rarity: item.itemDefinition.rarity,
      })),
      bonuses: aggregateEquipmentBonuses(equipped.map((item) => item.itemDefinition)),
    };
  }

  private async findActiveHousing(characterId: string) {
    return this.prisma.characterHousing.findFirst({
      where: { characterId, status: 'ACTIVE' },
      include: {
        building: {
          include: { district: { include: { planet: { select: { id: true, name: true } } } } },
        },
      },
    });
  }

  async getHousing(id: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only access your own housing');
    }

    const housing = await this.findActiveHousing(id);
    if (!housing) {
      const rentableHere =
        character.currentBuildingId != null
          ? await this.prisma.building.findFirst({
              where: { id: character.currentBuildingId, status: 'OPEN' },
              include: { district: true },
            })
          : null;
      const functionality = Array.isArray(rentableHere?.functionality)
        ? (rentableHere?.functionality as string[])
        : [];
      const canRentHere = Boolean(rentableHere && functionality.includes('SAFEHOUSE'));
      return {
        housing: null,
        storedItems: [],
        canRentHere,
        rentQuote:
          canRentHere && rentableHere
            ? {
                buildingId: rentableHere.id,
                buildingName: rentableHere.name,
                rentPerDay: calculateDailyRent(rentableHere.district),
              }
            : null,
      };
    }

    const storedItems = await this.prisma.itemInstance.findMany({
      where: { ownerType: 'HOUSING', ownerId: housing.id },
      include: { itemDefinition: true },
    });

    return {
      housing,
      storedItems,
      canRentHere: false,
      rentQuote: null,
      atHousingBuilding: character.currentBuildingId === housing.buildingId,
    };
  }

  async rentHousing(id: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only rent housing for your own character');
    }

    const existing = await this.findActiveHousing(id);
    if (existing) {
      throw new BadRequestException(
        `You already rent ${existing.building.name}. Cancel it before renting elsewhere.`,
      );
    }

    if (!character.currentBuildingId) {
      throw new BadRequestException('You must be inside a safehouse to rent it');
    }
    const building = await this.prisma.building.findUnique({
      where: { id: character.currentBuildingId },
      include: { district: true },
    });
    const functionality = Array.isArray(building?.functionality)
      ? (building?.functionality as string[])
      : [];
    if (!building || building.status !== 'OPEN' || !functionality.includes('SAFEHOUSE')) {
      throw new BadRequestException('You can only rent an open safehouse you are standing in');
    }

    const rentPerDay = calculateDailyRent(building.district);
    if (character.credits < rentPerDay) {
      throw new BadRequestException(
        `First day's rent is ${rentPerDay} credits (you have ${Math.floor(character.credits)})`,
      );
    }

    const nextRentDueAt = new Date(Date.now() + 24 * 3_600_000);
    const [housing] = await this.prisma.$transaction([
      this.prisma.characterHousing.create({
        data: {
          characterId: id,
          buildingId: building.id,
          rentPerDay,
          nextRentDueAt,
          totalRentPaid: rentPerDay,
        },
        include: { building: true },
      }),
      this.prisma.character.update({
        where: { id },
        data: { credits: Number((character.credits - rentPerDay).toFixed(2)) },
      }),
      this.prisma.activityLog.create({
        data: {
          playerId,
          characterId: id,
          type: 'HOUSING_RENTED',
          message: `${character.name} rented ${building.name} for ${rentPerDay}/day`,
          relatedEntities: { buildingId: building.id, rentPerDay },
        },
      }),
    ]);

    return housing;
  }

  async cancelHousing(id: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only cancel your own housing');
    }

    const housing = await this.findActiveHousing(id);
    if (!housing) throw new BadRequestException('You are not renting anywhere');

    const [returned] = await this.prisma.$transaction([
      this.prisma.itemInstance.updateMany({
        where: { ownerType: 'HOUSING', ownerId: housing.id },
        data: { ownerType: 'CHARACTER', ownerId: id },
      }),
      this.prisma.characterHousing.update({
        where: { id: housing.id },
        data: { status: 'ENDED', endedAt: new Date() },
      }),
      this.prisma.activityLog.create({
        data: {
          playerId,
          characterId: id,
          type: 'HOUSING_ENDED',
          message: `${character.name} gave up the lease on ${housing.building.name}`,
          relatedEntities: { buildingId: housing.buildingId },
        },
      }),
    ]);

    return { ended: true, itemsReturned: returned.count };
  }

  async storeItemInHousing(id: string, playerId: string, itemInstanceId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only manage your own storage');
    }

    const housing = await this.findActiveHousing(id);
    if (!housing) throw new BadRequestException('You are not renting anywhere');
    if (character.currentBuildingId !== housing.buildingId) {
      throw new BadRequestException(
        `You must be inside ${housing.building.name} to access your storage`,
      );
    }

    const item = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { itemDefinition: { select: { name: true } } },
    });
    if (!item || item.ownerType !== 'CHARACTER' || item.ownerId !== id) {
      throw new NotFoundException('Item not found in your inventory');
    }
    if (item.equippedSlot) {
      throw new BadRequestException('Unequip the item before storing it');
    }

    await this.prisma.itemInstance.update({
      where: { id: itemInstanceId },
      data: { ownerType: 'HOUSING', ownerId: housing.id },
    });

    return { stored: true, itemName: item.itemDefinition.name };
  }

  async retrieveItemFromHousing(id: string, playerId: string, itemInstanceId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only manage your own storage');
    }

    const housing = await this.findActiveHousing(id);
    if (!housing) throw new BadRequestException('You are not renting anywhere');
    if (character.currentBuildingId !== housing.buildingId) {
      throw new BadRequestException(
        `You must be inside ${housing.building.name} to access your storage`,
      );
    }

    const item = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { itemDefinition: { select: { name: true } } },
    });
    if (!item || item.ownerType !== 'HOUSING' || item.ownerId !== housing.id) {
      throw new NotFoundException('Item not found in your storage');
    }

    await this.prisma.itemInstance.update({
      where: { id: itemInstanceId },
      data: { ownerType: 'CHARACTER', ownerId: id },
    });

    return { retrieved: true, itemName: item.itemDefinition.name };
  }

  async equipItem(id: string, playerId: string, itemInstanceId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only equip items on your own character');
    }

    const item = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { itemDefinition: true },
    });
    if (!item || item.ownerType !== 'CHARACTER' || item.ownerId !== id) {
      throw new NotFoundException('Item not found in your inventory');
    }

    const slot = slotForCategory(item.itemDefinition.category);
    if (!slot) {
      throw new BadRequestException(
        `${item.itemDefinition.name} cannot be equipped (category ${item.itemDefinition.category})`,
      );
    }
    if (item.equippedSlot) {
      throw new BadRequestException(`${item.itemDefinition.name} is already equipped`);
    }
    if (item.condition <= 0) {
      throw new BadRequestException(`${item.itemDefinition.name} is broken — repair it first`);
    }

    await this.prisma.$transaction([
      // swap out whatever occupies the slot
      this.prisma.itemInstance.updateMany({
        where: { ownerType: 'CHARACTER', ownerId: id, equippedSlot: slot },
        data: { equippedSlot: null },
      }),
      this.prisma.itemInstance.update({
        where: { id: itemInstanceId },
        data: { equippedSlot: slot },
      }),
    ]);

    return this.buildEquipmentView(id);
  }

  async unequipItem(id: string, playerId: string, itemInstanceId: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only unequip items on your own character');
    }

    const item = await this.prisma.itemInstance.findUnique({ where: { id: itemInstanceId } });
    if (!item || item.ownerType !== 'CHARACTER' || item.ownerId !== id) {
      throw new NotFoundException('Item not found in your inventory');
    }
    if (!item.equippedSlot) {
      throw new BadRequestException('Item is not equipped');
    }

    await this.prisma.itemInstance.update({
      where: { id: itemInstanceId },
      data: { equippedSlot: null },
    });

    return this.buildEquipmentView(id);
  }

  private buildProgressionView(xp: number, level: number) {
    const currentThreshold = xpThresholdForLevel(level);
    const nextThreshold = xpThresholdForLevel(level + 1);
    const atMaxLevel = level >= MAX_LEVEL;
    return {
      xpIntoLevel: Math.max(0, xp - currentThreshold),
      xpForNextLevel: atMaxLevel ? null : xpToNextLevel(level),
      nextLevelAt: atMaxLevel ? null : nextThreshold,
      atMaxLevel,
    };
  }

  async allocateStatPoints(
    id: string,
    playerId: string,
    allocations: Record<string, number> | undefined,
  ) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character ${id} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only allocate stats for your own character');
    }

    if (!allocations || typeof allocations !== 'object' || Array.isArray(allocations)) {
      throw new BadRequestException('Provide an allocations object, e.g. { "hacking": 2 }');
    }

    const entries = Object.entries(allocations).filter(([, points]) => points !== 0);
    if (entries.length === 0) {
      throw new BadRequestException('No stat points allocated');
    }

    let totalPoints = 0;
    const updates: Partial<Record<AllocatableStat, number>> = {};
    for (const [stat, points] of entries) {
      if (!ALLOCATABLE_STATS.includes(stat as AllocatableStat)) {
        throw new BadRequestException(`Unknown stat: ${stat}`);
      }
      if (!Number.isInteger(points) || points < 1) {
        throw new BadRequestException(`Allocation for ${stat} must be a positive integer`);
      }
      const currentValue = character[stat as AllocatableStat];
      if (currentValue + points > STAT_CAP) {
        throw new BadRequestException(
          `${stat} is capped at ${STAT_CAP} (current: ${currentValue})`,
        );
      }
      updates[stat as AllocatableStat] = currentValue + points;
      totalPoints += points;
    }

    if (totalPoints > character.unspentStatPoints) {
      throw new BadRequestException(
        `Not enough stat points: allocating ${totalPoints}, available ${character.unspentStatPoints}`,
      );
    }

    const updated = await this.prisma.character.update({
      where: { id },
      data: {
        ...updates,
        unspentStatPoints: character.unspentStatPoints - totalPoints,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        playerId,
        characterId: id,
        type: 'STAT_TRAINED',
        message: `${character.name} trained: ${entries
          .map(([stat, points]) => `${stat} +${points}`)
          .join(', ')}`,
        relatedEntities: { allocations },
      },
    });

    return updated;
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

    const [destinationPlanet, destinationDistrict, activeTravelBlock] = await Promise.all([
      this.prisma.planet.findUnique({ where: { id: destinationPlanetId } }),
      this.prisma.district.findUnique({
        where: { id: destinationDistrictId },
        include: { planet: true, controllingFaction: true },
      }),
      this.getActiveTravelBlock(id),
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
    const warnings = [
      ...(activeTravelBlock ? [activeTravelBlock.warning] : []),
      ...standing.warnings,
    ];
    const blocked = Boolean(activeTravelBlock) || standing.blocked;

    return {
      ...travel,
      travelCost,
      travelSurcharge: standing.travelSurcharge,
      blocked,
      destination: {
        planetId: destinationPlanet.id,
        planetName: destinationPlanet.name,
        districtId: destinationDistrict.id,
        districtName: destinationDistrict.name,
        buildingId: dto.buildingId ?? null,
      },
      affordable: !blocked && character.credits >= travelCost,
      currentCredits: character.credits,
      controllingFactionName: standing.controllingFactionName,
      reputationScore: standing.reputationScore,
      reputationModifier: standing.reputationModifier,
      warnings,
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

    return this.opportunitiesService.startRestActivity(character, {
      buildingId: building.id,
      buildingName: building.name,
      energyPerMinute: isSafehouse ? 3 : isClinic ? 1 : 1.25,
      healthPerMinute: isClinic ? 2 : isSafehouse ? 1.25 : 0.5,
      costPerMinute: isClinic ? 2.67 : isSafehouse ? 1.5 : 0.75,
      wantedReductionPerMinute: isSafehouse ? 0.05 : 0,
    });
  }

  async stopRest(id: string, playerId: string) {
    await this.findById(id, playerId);
    const stopped = await this.opportunitiesService.interruptActiveRest(id, playerId, 'manual');
    if (!stopped) {
      throw new BadRequestException('No active rest session to stop');
    }
    return stopped;
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
      this.prisma.character.update({
        where: { id },
        data: {
          ...updates,
          ...(typeof updates.energy === 'number' && updates.energy > character.energy
            ? { lastEnergyDecayAt: new Date() }
            : {}),
        },
      }),
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

    const [destinationPlanet, destinationDistrict, destinationBuilding, activeTravelBlock] = await Promise.all([
      this.prisma.planet.findUnique({ where: { id: destinationPlanetId } }),
      this.prisma.district.findUnique({
        where: { id: destinationDistrictId },
        include: { planet: true, controllingFaction: true },
      }),
      destinationBuildingId
        ? this.prisma.building.findUnique({ where: { id: destinationBuildingId } })
        : Promise.resolve(null),
      this.getActiveTravelBlock(id),
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
    if (activeTravelBlock) {
      throw new BadRequestException(activeTravelBlock.warning);
    }
    if (standing.blocked) {
      throw new BadRequestException(standing.warnings[0] ?? 'Travel is blocked by local control');
    }

    const travelCost = travel.travelCost + standing.travelSurcharge;

    if (character.credits < travelCost) {
      throw new BadRequestException(
        `Travel requires ${travelCost} credits (current: ${character.credits})`,
      );
    }

    await this.opportunitiesService.interruptActiveRest(id, playerId, 'travel');

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
