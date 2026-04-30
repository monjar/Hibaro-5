import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CharacterStats, Requirement, RequirementContext, checkRequirements } from '@heliora/game-rules';
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

type RewardEntry = Record<string, unknown>;
type QuestDataEntry = {
  chainId?: string;
  stepNumber?: number;
  totalSteps?: number;
  isOneOff?: boolean;
  hint?: string;
  objectives?: Array<Record<string, unknown>>;
};

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
    const requirementContext = await this.buildRequirementContext(characterId);
    const completedQuestIds = new Set(requirementContext.completedQuestIds ?? []);
    const unlockSources = this.buildQuestUnlockSources(all);
    const characterStats = this.toCharacterStats(character);

    return all.filter((opp) => {
      if (inProgressIds.has(opp.id)) return false;
      if (this.isOneOffQuestCompleted(opp, completedQuestIds)) return false;
      if (!this.isQuestUnlocked(opp, completedQuestIds, unlockSources)) return false;
      return checkRequirements(
        characterStats,
        this.readRequirements(opp.requirements),
        requirementContext,
      ).passed;
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

    const [requirementContext, allDefinitions] = await Promise.all([
      this.buildRequirementContext(characterId),
      definition.kind === 'QUEST'
        ? this.prisma.opportunityDefinition.findMany()
        : Promise.resolve([definition]),
    ]);
    const completedQuestIds = new Set(requirementContext.completedQuestIds ?? []);
    if (this.isOneOffQuestCompleted(definition, completedQuestIds)) {
      throw new BadRequestException('This quest is a one-off and has already been completed');
    }
    const unlockSources = this.buildQuestUnlockSources(allDefinitions);
    if (!this.isQuestUnlocked(definition, completedQuestIds, unlockSources)) {
      throw new BadRequestException('Quest is locked until you complete its prerequisite chain');
    }

    const requirements = this.readRequirements(definition.requirements);
    const requirementResult = checkRequirements(
      this.toCharacterStats(character),
      requirements,
      requirementContext,
    );
    if (!requirementResult.passed) {
      throw new BadRequestException(
        this.describeFailedRequirement(
          requirementResult.failedRequirements[0],
          character,
          requirementContext,
        ),
      );
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
        } else if (reward.type === 'UNLOCK_QUEST' || reward.type === 'UNLOCK_BUILDING') {
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

    const questData = this.readQuestData(definition.questData);
    const unlockedQuestIds = success
      ? appliedRewards
          .filter((reward) => reward.type === 'UNLOCK_QUEST' && typeof reward.questId === 'string')
          .map((reward) => reward.questId as string)
      : [];
    const unlockedQuests = unlockedQuestIds.length
      ? await this.prisma.opportunityDefinition.findMany({
          where: { id: { in: unlockedQuestIds } },
          select: { id: true, title: true },
        })
      : [];

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
      ...(definition.kind === 'QUEST'
        ? {
            questProgress: {
              chainId: questData?.chainId ?? null,
              stepNumber: questData?.stepNumber ?? null,
              totalSteps: questData?.totalSteps ?? null,
              unlockedQuests,
            },
          }
        : {}),
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

  private async buildRequirementContext(characterId: string): Promise<RequirementContext> {
    const [relationships, completedQuestInstances] = await Promise.all([
      this.prisma.relationship.findMany({
        where: {
          sourceType: 'CHARACTER',
          sourceId: characterId,
          relationshipType: 'REPUTATION',
        },
      }),
      this.prisma.opportunityInstance.findMany({
        where: {
          characterId,
          status: 'COMPLETED',
          definition: { kind: 'QUEST' },
        },
        select: { definitionId: true },
      }),
    ]);

    const factionReputations: Record<string, number> = {};
    const corporationReputations: Record<string, number> = {};

    for (const relationship of relationships) {
      if (relationship.targetType === 'FACTION') {
        factionReputations[relationship.targetId] = relationship.value;
      }
      if (relationship.targetType === 'CORPORATION') {
        corporationReputations[relationship.targetId] = relationship.value;
      }
    }

    return {
      factionReputations,
      corporationReputations,
      completedQuestIds: completedQuestInstances.map((instance) => instance.definitionId),
    };
  }

  private buildQuestUnlockSources(definitions: Array<{ id: string; rewards: unknown }>) {
    const unlockSources = new Map<string, string[]>();

    for (const definition of definitions) {
      for (const reward of this.readRewards(definition.rewards)) {
        if (reward.type !== 'UNLOCK_QUEST' || typeof reward.questId !== 'string') continue;
        const sourceIds = unlockSources.get(reward.questId as string) ?? [];
        sourceIds.push(definition.id);
        unlockSources.set(reward.questId as string, sourceIds);
      }
    }

    return unlockSources;
  }

  private isQuestUnlocked(
    definition: { id: string; kind: string },
    completedQuestIds: Set<string>,
    unlockSources: Map<string, string[]>,
  ) {
    if (definition.kind !== 'QUEST') return true;
    const sourceIds = unlockSources.get(definition.id) ?? [];
    if (sourceIds.length === 0) return true;
    return sourceIds.some((sourceId) => completedQuestIds.has(sourceId));
  }

  private isOneOffQuestCompleted(
    definition: { id: string; kind: string; questData: unknown },
    completedQuestIds: Set<string>,
  ) {
    if (definition.kind !== 'QUEST') return false;
    const questData = this.readQuestData(definition.questData);
    return Boolean(questData?.isOneOff && completedQuestIds.has(definition.id));
  }

  private toCharacterStats(character: Record<string, unknown>): CharacterStats {
    return {
      id: String(character.id),
      name: String(character.name),
      credits: Number(character.credits ?? 0),
      health: Number(character.health ?? 0),
      maxHealth: Number(character.maxHealth ?? character.health ?? 0),
      energy: Number(character.energy ?? 0),
      maxEnergy: Number(character.maxEnergy ?? character.energy ?? 0),
      wantedLevel: Number(character.wantedLevel ?? 0),
      strength: Number(character.strength ?? 0),
      agility: Number(character.agility ?? 0),
      intelligence: Number(character.intelligence ?? 0),
      charisma: Number(character.charisma ?? 0),
      hacking: Number(character.hacking ?? 0),
      combat: Number(character.combat ?? 0),
      stealth: Number(character.stealth ?? 0),
      engineering: Number(character.engineering ?? 0),
      reputation: Number(character.reputation ?? 0),
    };
  }

  private readRequirements(value: unknown): Requirement[] {
    return Array.isArray(value) ? (value as Requirement[]) : [];
  }

  private readRewards(value: unknown): RewardEntry[] {
    return Array.isArray(value) ? (value as RewardEntry[]) : [];
  }

  private readQuestData(value: unknown): QuestDataEntry | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as QuestDataEntry;
  }

  private describeFailedRequirement(
    requirement: Requirement,
    character: Record<string, unknown>,
    context: RequirementContext,
  ) {
    switch (requirement.type) {
      case 'STAT_MIN': {
        const current = Number(character[requirement.key as keyof typeof character] ?? 0);
        return `Requirement not met: ${requirement.key} must be >= ${requirement.value} (current: ${current})`;
      }
      case 'STAT_MAX': {
        const current = Number(character[requirement.key as keyof typeof character] ?? 0);
        return `Requirement not met: ${requirement.key} must be <= ${requirement.value} (current: ${current})`;
      }
      case 'CREDITS_MIN':
        return `Requirement not met: credits must be >= ${requirement.value} (current: ${character.credits})`;
      case 'FACTION_REPUTATION_MIN':
      case 'RELATIONSHIP_MIN': {
        const current = requirement.id
          ? (requirement.scope === 'CORPORATION'
              ? context.corporationReputations?.[requirement.id]
              : context.factionReputations?.[requirement.id]) ?? 0
          : 0;
        return `Requirement not met: reputation must be >= ${requirement.value} (current: ${current})`;
      }
      case 'FACTION_REPUTATION_MAX':
      case 'CORPORATION_REPUTATION_MAX':
      case 'RELATIONSHIP_MAX': {
        const current = requirement.id
          ? (requirement.scope === 'CORPORATION' || requirement.type === 'CORPORATION_REPUTATION_MAX'
              ? context.corporationReputations?.[requirement.id]
              : context.factionReputations?.[requirement.id]) ?? 0
          : 0;
        return `Requirement not met: reputation must be <= ${requirement.value} (current: ${current})`;
      }
      case 'CORPORATION_REPUTATION_MIN': {
        const current = requirement.id
          ? context.corporationReputations?.[requirement.id] ?? 0
          : 0;
        return `Requirement not met: corporation reputation must be >= ${requirement.value} (current: ${current})`;
      }
      case 'QUEST_COMPLETED':
        return 'Requirement not met: complete the prerequisite quest chain first';
      default:
        return `Requirement not met: ${requirement.type}`;
    }
  }
}
