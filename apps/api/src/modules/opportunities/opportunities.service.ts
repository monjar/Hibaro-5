import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const STAT_XP_GAIN_PROBABILITY = 0.5;
const DEFAULT_RISK_PROBABILITY = 0.3;

@Injectable()
export class OpportunitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.opportunityDefinition.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findAvailableForCharacter(characterId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);

    const now = new Date();
    const all = await this.prisma.opportunityDefinition.findMany({
      where: {
        OR: [{ startsAvailableAt: null }, { startsAvailableAt: { lte: now } }],
        AND: [
          { OR: [{ endsAvailableAt: null }, { endsAvailableAt: { gte: now } }] },
        ],
      },
    });

    // Filter out opportunities the character already has in progress
    const inProgress = await this.prisma.opportunityInstance.findMany({
      where: { characterId, status: { in: ['IN_PROGRESS', 'ACCEPTED'] } },
      select: { definitionId: true },
    });
    const inProgressIds = new Set(inProgress.map((i) => i.definitionId));

    return all.filter((opp) => {
      if (inProgressIds.has(opp.id)) return false;
      // Check repeatability: if DAILY, check if done today
      // Simplified: just return available
      return true;
    });
  }

  async findInstancesForCharacter(characterId: string) {
    return this.prisma.opportunityInstance.findMany({
      where: { characterId },
      include: { definition: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async acceptOpportunity(opportunityId: string, characterId: string) {
    const [definition, character] = await Promise.all([
      this.prisma.opportunityDefinition.findUnique({ where: { id: opportunityId } }),
      this.prisma.character.findUnique({ where: { id: characterId } }),
    ]);

    if (!definition) throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);

    // Check if already in progress
    const existing = await this.prisma.opportunityInstance.findFirst({
      where: { definitionId: opportunityId, characterId, status: { in: ['IN_PROGRESS', 'ACCEPTED'] } },
    });
    if (existing) throw new BadRequestException('Opportunity already in progress');

    // Check requirements (basic)
    const requirements = definition.requirements as any[];
    for (const req of requirements) {
      if (req.type === 'STAT_MIN') {
        const statValue = character[req.key as keyof typeof character] as number;
        if (statValue < req.value) {
          throw new BadRequestException(
            `Requirement not met: ${req.key} must be >= ${req.value} (current: ${statValue})`,
          );
        }
      }
      if (req.type === 'CREDITS_MIN') {
        if (character.credits < req.value) {
          throw new BadRequestException(
            `Requirement not met: credits must be >= ${req.value} (current: ${character.credits})`,
          );
        }
      }
    }

    const now = new Date();
    const completesAt = definition.durationMinutes
      ? new Date(now.getTime() + definition.durationMinutes * 60 * 1000)
      : new Date(now.getTime() + 60 * 60 * 1000); // default 1 hour

    const instance = await this.prisma.opportunityInstance.create({
      data: {
        definitionId: opportunityId,
        characterId,
        status: 'IN_PROGRESS',
        startedAt: now,
        completesAt,
      },
      include: { definition: true },
    });

    // Log activity
    if (character.playerId) {
      const activityType = this.acceptActivityType(definition.kind);
      await this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId,
          type: activityType,
          message: `${character.name} accepted: ${definition.title}`,
          relatedEntities: { opportunityId, instanceId: instance.id },
        },
      });
    }

    return instance;
  }

  async resolveInstance(instanceId: string) {
    const instance = await this.prisma.opportunityInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true, character: true },
    });
    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found`);
    if (instance.status === 'COMPLETED' || instance.status === 'FAILED') {
      throw new BadRequestException(`Instance already ${instance.status}`);
    }

    return this.resolveInstanceInternal(instance);
  }

  async resolveInstanceInternal(instance: any) {
    const { definition, character } = instance;
    const now = new Date();

    // Calculate success chance
    const successChance = this.calculateSuccessChance(character, definition);
    const roll = Math.random();
    const success = roll <= successChance;

    const rewards = definition.rewards as any[];
    const risks = definition.risks as any[];
    const appliedRewards: any[] = [];
    const appliedRisks: any[] = [];

    const characterUpdates: any = {};

    if (success) {
      // Apply rewards
      for (const reward of rewards) {
        if (reward.type === 'CREDITS') {
          characterUpdates.credits = (character.credits || 0) + reward.value;
          appliedRewards.push(reward);
        } else if (reward.type === 'STAT_XP') {
          const currentVal = character[reward.key] || 0;
          if (Math.random() < STAT_XP_GAIN_PROBABILITY) {
            characterUpdates[reward.key] = currentVal + 1;
          }
          appliedRewards.push(reward);
        } else if (reward.type === 'FACTION_REPUTATION') {
          // Update relationship
          await this.upsertRelationship('CHARACTER', character.id, 'FACTION', reward.factionId, 'REPUTATION', reward.value);
          appliedRewards.push(reward);
        } else if (reward.type === 'CORPORATION_REPUTATION') {
          await this.upsertRelationship('CHARACTER', character.id, 'CORPORATION', reward.corporationId, 'REPUTATION', reward.value);
          appliedRewards.push(reward);
        }
      }
    } else {
      // Apply risks on failure
      for (const risk of risks) {
        const riskRoll = Math.random();
        if (riskRoll < (risk.probability ?? DEFAULT_RISK_PROBABILITY)) {
          const consequences = risk.consequences || [];
          for (const consequence of consequences) {
            if (consequence.type === 'MODIFY_WANTED_LEVEL') {
              characterUpdates.wantedLevel = Math.max(0, (character.wantedLevel || 0) + consequence.value);
              appliedRisks.push(consequence);
            } else if (consequence.type === 'MODIFY_STAT' && consequence.key === 'health') {
              characterUpdates.health = Math.max(0, (character.health || 100) + consequence.value);
              appliedRisks.push(consequence);
            }
          }
        }
      }
    }

    // Update character
    if (Object.keys(characterUpdates).length > 0) {
      await this.prisma.character.update({ where: { id: character.id }, data: characterUpdates });
    }

    // Update instance
    const outcome = {
      success,
      roll: Math.round(roll * 100) / 100,
      successChance: Math.round(successChance * 100) / 100,
      appliedRewards,
      appliedRisks,
      resolvedAt: now.toISOString(),
    };

    const updatedInstance = await this.prisma.opportunityInstance.update({
      where: { id: instance.id },
      data: {
        status: success ? 'COMPLETED' : 'FAILED',
        completedAt: now,
        outcome,
      },
      include: { definition: true },
    });

    // Log activity
    if (character.playerId) {
      const activityType = success
        ? this.resolveActivityType(definition.kind)
        : 'GIG_FAILED';
      await this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId: character.id,
          type: activityType,
          message: success
            ? `${character.name} completed: ${definition.title}`
            : `${character.name} failed: ${definition.title}`,
          relatedEntities: { instanceId: instance.id, outcome },
        },
      });
    }

    return updatedInstance;
  }

  private acceptActivityType(kind: string): string {
    switch (kind) {
      case 'QUEST': return 'QUEST_STARTED';
      case 'JOB': return 'JOB_ACCEPTED';
      default: return 'GIG_ACCEPTED';
    }
  }

  private resolveActivityType(kind: string): string {
    switch (kind) {
      case 'QUEST': return 'QUEST_COMPLETED';
      case 'JOB': return 'JOB_COMPLETED';
      default: return 'GIG_COMPLETED';
    }
  }

  private calculateSuccessChance(character: any, definition: any): number {
    let chance = 0.7;
    chance -= (definition.difficulty || 1) * 0.08;

    const type = definition.type;
    const statBonus = (stat: number) => (stat || 0) * 0.005;

    switch (type) {
      case 'HACKING':
        chance += statBonus((character.hacking || 0) + (character.intelligence || 0));
        break;
      case 'SMUGGLING':
        chance += statBonus((character.stealth || 0) + (character.charisma || 0));
        break;
      case 'BOUNTY':
      case 'ASSASSINATION':
        chance += statBonus((character.combat || 0) + (character.agility || 0));
        break;
      case 'REPAIR':
        chance += statBonus((character.engineering || 0) + (character.intelligence || 0));
        break;
      case 'DELIVERY':
        chance += statBonus(character.agility || 0);
        break;
      case 'DIPLOMACY':
        chance += statBonus(character.charisma || 0);
        break;
      case 'MINING':
        chance += statBonus((character.strength || 0) + (character.engineering || 0));
        break;
      case 'INVESTIGATION':
        chance += statBonus((character.intelligence || 0) + (character.charisma || 0));
        break;
    }

    return Math.min(0.95, Math.max(0.05, chance));
  }

  private async upsertRelationship(
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
    relationshipType: any,
    delta: number,
  ) {
    const existing = await this.prisma.relationship.findFirst({
      where: { sourceType, sourceId, targetType, targetId, relationshipType },
    });
    if (existing) {
      await this.prisma.relationship.update({
        where: { id: existing.id },
        data: { value: existing.value + delta },
      });
    } else {
      await this.prisma.relationship.create({
        data: { sourceType, sourceId, targetType, targetId, relationshipType, value: delta },
      });
    }
  }
}
