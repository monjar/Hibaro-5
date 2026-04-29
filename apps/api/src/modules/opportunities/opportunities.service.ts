import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, OpportunityType, RelationshipType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

const STAT_XP_GAIN_PROBABILITY = 0.5;
const DEFAULT_RISK_PROBABILITY = 0.3;

export interface AdminOpportunityInput {
  title: string;
  description?: string | null;
  kind: 'GIG' | 'JOB' | 'QUEST';
  type: string;
  difficulty?: number;
  durationMinutes?: number;
  requirements?: unknown[];
  rewards?: unknown[];
  risks?: unknown[];
  repeatability?: unknown;
}

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
  ) {}

  async findAll() {
    return this.prisma.opportunityDefinition.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const def = await this.prisma.opportunityDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundException(`Opportunity ${id} not found`);
    return def;
  }

  async createDefinition(data: AdminOpportunityInput) {
    this.validateAdminInput(data);
    return this.prisma.opportunityDefinition.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        kind: data.kind,
        type: data.type as OpportunityType,
        difficulty: data.difficulty ?? 1,
        durationMinutes: data.durationMinutes ?? 60,
        requirements: (data.requirements ?? []) as never,
        rewards: (data.rewards ?? []) as never,
        risks: (data.risks ?? []) as never,
        repeatability: (data.repeatability ?? null) as never,
      },
    });
  }

  async updateDefinition(id: string, data: Partial<AdminOpportunityInput>) {
    await this.findOne(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.opportunityDefinition.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        ...(data.type !== undefined ? { type: data.type as OpportunityType } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.requirements !== undefined
          ? { requirements: data.requirements as never }
          : {}),
        ...(data.rewards !== undefined ? { rewards: data.rewards as never } : {}),
        ...(data.risks !== undefined ? { risks: data.risks as never } : {}),
        ...(data.repeatability !== undefined
          ? { repeatability: (data.repeatability ?? null) as never }
          : {}),
      },
    });
  }

  async deleteDefinition(id: string) {
    await this.findOne(id);
    const inFlight = await this.prisma.opportunityInstance.count({
      where: { definitionId: id, status: { in: ['IN_PROGRESS', 'ACCEPTED'] } },
    });
    if (inFlight > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inFlight} instance(s) still in progress. Resolve or fail them first.`,
      );
    }
    await this.prisma.opportunityInstance.deleteMany({ where: { definitionId: id } });
    await this.prisma.jobEmployment.deleteMany({ where: { opportunityId: id } });
    await this.prisma.opportunityDefinition.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validateAdminInput(input: AdminOpportunityInput) {
    if (!input.title || input.title.trim().length < 3) {
      throw new BadRequestException('Title must be at least 3 characters');
    }
    if (!['GIG', 'JOB', 'QUEST'].includes(input.kind)) {
      throw new BadRequestException('Kind must be GIG, JOB, or QUEST');
    }
    if (input.difficulty !== undefined && (input.difficulty < 1 || input.difficulty > 10)) {
      throw new BadRequestException('Difficulty must be between 1 and 10');
    }
    if (input.durationMinutes !== undefined && input.durationMinutes < 1) {
      throw new BadRequestException('durationMinutes must be at least 1');
    }
  }

  async findAvailableForCharacter(characterId: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only access opportunities for your own character');
    }

    const now = new Date();
    const all = await this.prisma.opportunityDefinition.findMany({
      where: {
        AND: [
          { OR: [{ startsAvailableAt: null }, { startsAvailableAt: { lte: now } }] },
          { OR: [{ endsAvailableAt: null }, { endsAvailableAt: { gte: now } }] },
        ],
      },
    });

    const inProgress = await this.prisma.opportunityInstance.findMany({
      where: { characterId, status: { in: ['IN_PROGRESS', 'ACCEPTED'] } },
      select: { definitionId: true },
    });
    const inProgressIds = new Set(inProgress.map((i) => i.definitionId));

    return all.filter((opp) => {
      if (inProgressIds.has(opp.id)) return false;
      return true;
    });
  }

  async findInstancesForCharacter(characterId: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only access opportunities for your own character');
    }

    return this.prisma.opportunityInstance.findMany({
      where: { characterId },
      include: { definition: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async acceptOpportunity(opportunityId: string, characterId: string, playerId: string) {
    const [definition, character] = await Promise.all([
      this.prisma.opportunityDefinition.findUnique({ where: { id: opportunityId } }),
      this.prisma.character.findUnique({ where: { id: characterId } }),
    ]);

    if (!definition) throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only accept opportunities for your own character');
    }

    const activeAny = await this.prisma.opportunityInstance.findFirst({
      where: {
        characterId,
        status: { in: ['IN_PROGRESS', 'ACCEPTED'] },
      },
      include: { definition: { select: { title: true } } },
    });
    if (activeAny) {
      if (activeAny.definitionId === opportunityId) {
        throw new BadRequestException('Opportunity already in progress');
      }
      throw new BadRequestException(
        `You already have an activity in progress: ${activeAny.definition.title}. Finish or fail it before accepting another.`,
      );
    }

    if (definition.kind === 'JOB') {
      const employment = await this.jobs.findActiveEmployment(characterId, opportunityId);
      if (!employment || employment.status !== 'ACTIVE') {
        throw new BadRequestException(
          `You are not employed at ${definition.title}. Get hired before working a shift.`,
        );
      }
    }

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
      : new Date(now.getTime() + 60 * 60 * 1000);

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

  async resolveInstance(instanceId: string, playerId: string) {
    const instance = await this.prisma.opportunityInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true, character: true },
    });
    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found`);
    if (instance.character.playerId !== playerId) {
      throw new ForbiddenException('You can only resolve your own opportunity instances');
    }
    if (instance.status === 'COMPLETED' || instance.status === 'FAILED') {
      throw new BadRequestException(`Instance already ${instance.status}`);
    }

    return this.resolveInstanceInternal(instance);
  }

  async resolveInstanceInternal(instance: any) {
    const { definition, character } = instance;
    const now = new Date();
    const relationshipChanges: Array<{
      targetType: string;
      targetId: string;
      relationshipType: RelationshipType;
      delta: number;
    }> = [];

    const successChance = this.calculateSuccessChance(character, definition);
    const roll = Math.random();
    const success = roll <= successChance;

    const rewards = definition.rewards as any[];
    const risks = definition.risks as any[];
    const appliedRewards: any[] = [];
    const appliedRisks: any[] = [];

    const characterUpdates: any = {};

    if (success) {
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
          await this.upsertRelationship(
            'CHARACTER',
            character.id,
            'FACTION',
            reward.factionId,
            'REPUTATION',
            reward.value,
          );
          relationshipChanges.push({
            targetType: 'FACTION',
            targetId: reward.factionId,
            relationshipType: RelationshipType.REPUTATION,
            delta: reward.value,
          });
          appliedRewards.push(reward);
        } else if (reward.type === 'CORPORATION_REPUTATION') {
          await this.upsertRelationship(
            'CHARACTER',
            character.id,
            'CORPORATION',
            reward.corporationId,
            'REPUTATION',
            reward.value,
          );
          relationshipChanges.push({
            targetType: 'CORPORATION',
            targetId: reward.corporationId,
            relationshipType: RelationshipType.REPUTATION,
            delta: reward.value,
          });
          appliedRewards.push(reward);
        }
      }
    } else {
      for (const risk of risks) {
        const riskRoll = Math.random();
        if (riskRoll < (risk.probability ?? DEFAULT_RISK_PROBABILITY)) {
          const consequences = risk.consequences || [];
          for (const consequence of consequences) {
            if (consequence.type === 'MODIFY_WANTED_LEVEL') {
              characterUpdates.wantedLevel = Math.max(
                0,
                (character.wantedLevel || 0) + consequence.value,
              );
              appliedRisks.push(consequence);
            } else if (consequence.type === 'MODIFY_STAT' && consequence.key === 'health') {
              characterUpdates.health = Math.max(0, (character.health || 100) + consequence.value);
              appliedRisks.push(consequence);
            }
          }
        }
      }
    }

    if (Object.keys(characterUpdates).length > 0) {
      await this.prisma.character.update({ where: { id: character.id }, data: characterUpdates });
    }

    const outcome = {
      success,
      roll: Math.round(roll * 100) / 100,
      successChance: Math.round(successChance * 100) / 100,
      appliedRewards,
      appliedRisks,
      characterLedger: {
        before: {
          credits: character.credits,
          health: character.health,
          energy: character.energy,
          wantedLevel: character.wantedLevel,
        },
        after: {
          credits: characterUpdates.credits ?? character.credits,
          health: characterUpdates.health ?? character.health,
          energy: characterUpdates.energy ?? character.energy,
          wantedLevel: characterUpdates.wantedLevel ?? character.wantedLevel,
        },
        delta: {
          credits: (characterUpdates.credits ?? character.credits) - character.credits,
          health: (characterUpdates.health ?? character.health) - character.health,
          energy: (characterUpdates.energy ?? character.energy) - character.energy,
          wantedLevel:
            (characterUpdates.wantedLevel ?? character.wantedLevel) - character.wantedLevel,
        },
      },
      relationshipChanges,
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

    if (definition.kind === 'JOB' && success) {
      const employment = await this.jobs.findActiveEmployment(character.id, definition.id);
      if (employment && employment.status === 'ACTIVE') {
        const creditsEarned = outcome.characterLedger.delta.credits;
        await this.jobs.markShiftCompleted(employment.id, creditsEarned);
      }
    }

    if (character.playerId) {
      const activityType: ActivityType = success
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

  private acceptActivityType(kind: string): ActivityType {
    switch (kind) {
      case 'QUEST':
        return 'QUEST_STARTED';
      case 'JOB':
        return 'JOB_ACCEPTED';
      default:
        return 'GIG_ACCEPTED';
    }
  }

  private resolveActivityType(kind: string): ActivityType {
    switch (kind) {
      case 'QUEST':
        return 'QUEST_COMPLETED';
      case 'JOB':
        return 'JOB_COMPLETED';
      default:
        return 'GIG_COMPLETED';
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
