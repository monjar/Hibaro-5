import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CharacterStats,
  OpportunityDefinition as GameRulesOpportunityDefinition,
  Requirement,
  RequirementContext,
  Reward as GameRulesReward,
  Risk as GameRulesRisk,
  DecisionRecord,
  STAT_CAP,
  TimelineChoice,
  aggregateEquipmentBonuses,
  applyEquipmentBonuses,
  applyXpGain,
  calculateOpportunityEnergyCost,
  calculateOpportunitySuccessChance,
  checkRequirements,
  computeFinalSuccess,
  getOpportunityCheckProfile,
  resolveChoice,
  rollOpportunityCheck,
  totalDecisionCreditsBonus,
  totalDecisionRollBonus,
  xpRewardForOpportunity,
} from '@heliora/game-rules';
import { ActivityType, OpportunityType, RelationshipType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

const STAT_XP_GAIN_PROBABILITY = 0.5;
const DEFAULT_RISK_PROBABILITY = 0.3;
export const REST_OPPORTUNITY_ID = 'system-rest-cycle';

export interface AdminOpportunityInput {
  title: string;
  description?: string | null;
  acceptedDescription?: string | null;
  kind: 'GIG' | 'JOB' | 'QUEST';
  type: string;
  difficulty?: number;
  durationMinutes?: number;
  requirements?: unknown[];
  rewards?: unknown[];
  risks?: unknown[];
  timelineEvents?: OpportunityTimelineEvent[];
  possibleEventIds?: string[];
  repeatability?: unknown;
  questData?: QuestDataEntry | null;
  startsAvailableAt?: string | null;
  endsAvailableAt?: string | null;
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

type OpportunityTimelineEvent = {
  minute: number;
  description?: string;
  successDescription?: string;
  failureDescription?: string;
  choices?: TimelineChoice[];
};

type PlannedOutcome = {
  success: boolean;
  roll: number;
  successChance: number;
  checkTotal: number;
  difficultyClass: number;
  statModifier: number;
  relevantStatTotal: number;
  checkLabel: string;
};

type OpportunityProgress = {
  plannedOutcome?: PlannedOutcome;
  rest?: RestProgress;
  energyCost?: number;
  decisions?: DecisionRecord[];
};

type RestProfileInput = {
  buildingId: string;
  buildingName: string;
  energyPerMinute: number;
  healthPerMinute: number;
  costPerMinute: number;
  wantedReductionPerMinute: number;
};

type RestProgress = RestProfileInput & {
  durationMinutes: number;
  targetEnergy: number;
  targetHealth: number;
  targetWantedLevel: number;
};

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
  ) {}

  async findAll() {
    const definitions = await this.prisma.opportunityDefinition.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return definitions.filter((definition) => !this.isHiddenSystemOpportunity(definition));
  }

  async findOne(id: string) {
    const def = await this.prisma.opportunityDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundException(`Opportunity ${id} not found`);
    return def;
  }

  async createDefinition(data: AdminOpportunityInput) {
    this.validateAdminInput(data);
    await this.assertValidRewardReferences(data.rewards ?? []);
    return this.prisma.opportunityDefinition.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        acceptedDescription: data.acceptedDescription ?? null,
        kind: data.kind,
        type: data.type as OpportunityType,
        difficulty: data.difficulty ?? 10,
        durationMinutes: data.durationMinutes ?? 60,
        requirements: (data.requirements ?? []) as never,
        rewards: (data.rewards ?? []) as never,
        risks: (data.risks ?? []) as never,
        timelineEvents: this.readTimelineEvents(data.timelineEvents) as never,
        possibleEventIds: (data.possibleEventIds ?? []) as never,
        repeatability: (data.repeatability ?? null) as never,
        questData: (data.questData ?? null) as never,
        startsAvailableAt: data.startsAvailableAt ? new Date(data.startsAvailableAt) : null,
        endsAvailableAt: data.endsAvailableAt ? new Date(data.endsAvailableAt) : null,
      },
    });
  }

  async updateDefinition(id: string, data: Partial<AdminOpportunityInput>) {
    await this.findOne(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.rewards !== undefined) {
      await this.assertValidRewardReferences(data.rewards ?? []);
    }
    return this.prisma.opportunityDefinition.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.acceptedDescription !== undefined
          ? { acceptedDescription: data.acceptedDescription }
          : {}),
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        ...(data.type !== undefined ? { type: data.type as OpportunityType } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.requirements !== undefined
          ? { requirements: data.requirements as never }
          : {}),
        ...(data.rewards !== undefined ? { rewards: data.rewards as never } : {}),
        ...(data.risks !== undefined ? { risks: data.risks as never } : {}),
        ...(data.timelineEvents !== undefined
          ? { timelineEvents: this.readTimelineEvents(data.timelineEvents) as never }
          : {}),
        ...(data.possibleEventIds !== undefined
          ? { possibleEventIds: (data.possibleEventIds ?? []) as never }
          : {}),
        ...(data.repeatability !== undefined
          ? { repeatability: (data.repeatability ?? null) as never }
          : {}),
        ...(data.questData !== undefined ? { questData: (data.questData ?? null) as never } : {}),
        ...(data.startsAvailableAt !== undefined
          ? {
              startsAvailableAt: data.startsAvailableAt
                ? new Date(data.startsAvailableAt)
                : null,
            }
          : {}),
        ...(data.endsAvailableAt !== undefined
          ? {
              endsAvailableAt: data.endsAvailableAt ? new Date(data.endsAvailableAt) : null,
            }
          : {}),
      },
    });
  }

  async deleteDefinition(id: string) {
    if (id === REST_OPPORTUNITY_ID) {
      throw new BadRequestException('The system rest activity cannot be deleted');
    }
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
    if (input.difficulty !== undefined && (input.difficulty < 8 || input.difficulty > 30)) {
      throw new BadRequestException('Difficulty must be between 8 and 30');
    }
    if (input.durationMinutes !== undefined && input.durationMinutes < 1) {
      throw new BadRequestException('durationMinutes must be at least 1');
    }
    this.readTimelineEvents(input.timelineEvents);
    if (input.startsAvailableAt && Number.isNaN(new Date(input.startsAvailableAt).getTime())) {
      throw new BadRequestException('startsAvailableAt must be a valid ISO datetime');
    }
    if (input.endsAvailableAt && Number.isNaN(new Date(input.endsAvailableAt).getTime())) {
      throw new BadRequestException('endsAvailableAt must be a valid ISO datetime');
    }
    if (
      input.startsAvailableAt &&
      input.endsAvailableAt &&
      new Date(input.startsAvailableAt).getTime() > new Date(input.endsAvailableAt).getTime()
    ) {
      throw new BadRequestException('Availability start must be before the end time');
    }
  }

  private async assertValidRewardReferences(rewards: unknown[]) {
    const itemDefinitionIds = [...new Set(
      rewards
        .filter((reward): reward is { type?: unknown; itemDefinitionId?: unknown } =>
          typeof reward === 'object' && reward !== null,
        )
        .filter((reward) => reward.type === 'ITEM' && typeof reward.itemDefinitionId === 'string')
        .map((reward) => reward.itemDefinitionId as string),
    )];

    if (itemDefinitionIds.length === 0) {
      return;
    }

    const existingDefinitions = await this.prisma.itemDefinition.findMany({
      where: { id: { in: itemDefinitionIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingDefinitions.map((item) => item.id));
    const missingIds = itemDefinitionIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(`Unknown item reward definitions: ${missingIds.join(', ')}`);
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
    const characterStats = await this.getEffectiveStats(character);

    return all
      .filter((opp) => {
        if (this.isHiddenSystemOpportunity(opp)) return false;
        if (inProgressIds.has(opp.id)) return false;
        if (this.isOneOffQuestCompleted(opp, completedQuestIds)) return false;
        if (!this.isQuestUnlocked(opp, completedQuestIds, unlockSources)) return false;
        return checkRequirements(
          characterStats,
          this.readRequirements(opp.requirements),
          requirementContext,
        ).passed;
      })
      .map((opp) => ({
        ...opp,
        energyCost: calculateOpportunityEnergyCost({ difficulty: opp.difficulty }),
      }));
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
      if (activeAny.definitionId === REST_OPPORTUNITY_ID) {
        await this.interruptActiveRest(characterId, playerId, 'opportunity');
      } else if (activeAny.definitionId === opportunityId) {
        throw new BadRequestException('Opportunity already in progress');
      } else {
        throw new BadRequestException(
          `You already have an activity in progress: ${activeAny.definition.title}. Finish or fail it before accepting another.`,
        );
      }
    }

    const activeAfterRestInterrupt = await this.prisma.opportunityInstance.findFirst({
      where: {
        characterId,
        status: { in: ['IN_PROGRESS', 'ACCEPTED'] },
      },
      include: { definition: { select: { title: true } } },
    });
    if (activeAfterRestInterrupt) {
      if (activeAfterRestInterrupt.definitionId === opportunityId) {
        throw new BadRequestException('Opportunity already in progress');
      }
      throw new BadRequestException(
        `You already have an activity in progress: ${activeAfterRestInterrupt.definition.title}. Finish or fail it before accepting another.`,
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

    const effectiveStats = await this.getEffectiveStats(character);
    const requirements = this.readRequirements(definition.requirements);
    const requirementResult = checkRequirements(effectiveStats, requirements, requirementContext);
    if (!requirementResult.passed) {
      throw new BadRequestException(
        this.describeFailedRequirement(
          requirementResult.failedRequirements[0],
          character,
          requirementContext,
        ),
      );
    }

    const energyCost = calculateOpportunityEnergyCost({ difficulty: definition.difficulty });
    if ((character.energy ?? 0) < energyCost) {
      throw new BadRequestException(
        `Too exhausted for this work: it costs ${energyCost} energy and you have ${character.energy}. Rest at a safehouse, clinic, or hub first.`,
      );
    }

    const now = new Date();
    const completesAt = definition.durationMinutes
      ? new Date(now.getTime() + definition.durationMinutes * 60 * 1000)
      : new Date(now.getTime() + 60 * 60 * 1000);
    const plannedOutcome = this.planOutcome(effectiveStats, definition);

    await this.prisma.character.update({
      where: { id: characterId },
      data: { energy: Math.max(0, (character.energy ?? 0) - energyCost) },
    });

    const instance = await this.prisma.opportunityInstance.create({
      data: {
        definitionId: opportunityId,
        characterId,
        status: 'IN_PROGRESS',
        startedAt: now,
        completesAt,
        progress: { plannedOutcome, energyCost } as never,
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
    if (new Date(instance.completesAt).getTime() > Date.now()) {
      throw new BadRequestException('This activity is still in progress');
    }

    return this.resolveInstanceInternal(instance);
  }

  async decideInstance(instanceId: string, playerId: string, minute: number, choiceId: string) {
    const instance = await this.prisma.opportunityInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true, character: true },
    });
    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found`);
    if (instance.character.playerId !== playerId) {
      throw new ForbiddenException('You can only make decisions on your own activities');
    }
    if (instance.status !== 'IN_PROGRESS' && instance.status !== 'ACCEPTED') {
      throw new BadRequestException('This activity is no longer in progress');
    }
    if (this.isRestDefinitionId(instance.definitionId)) {
      throw new BadRequestException('Rest has no decision points');
    }

    const timelineEvents = Array.isArray(instance.definition.timelineEvents)
      ? (instance.definition.timelineEvents as unknown as OpportunityTimelineEvent[])
      : [];
    const event = timelineEvents.find(
      (entry) => entry.minute === minute && Array.isArray(entry.choices) && entry.choices.length,
    );
    if (!event) {
      throw new NotFoundException(`No decision point at minute ${minute}`);
    }

    const elapsedMinutes = Math.floor(
      (Date.now() - new Date(instance.startedAt).getTime()) / 60_000,
    );
    if (elapsedMinutes < minute) {
      throw new BadRequestException('This decision point has not come up yet');
    }

    const progress = this.readProgress(instance.progress) ?? {};
    const decisions = progress.decisions ?? [];
    if (decisions.some((decision) => decision.minute === minute)) {
      throw new BadRequestException('You already made this call');
    }

    const choice = (event.choices ?? []).find((entry) => entry.id === choiceId);
    if (!choice) {
      throw new BadRequestException(`Unknown choice: ${choiceId}`);
    }

    const character = instance.character;
    const cost = choice.costCredits ?? 0;
    if (cost > 0 && character.credits < cost) {
      throw new BadRequestException(
        `You need ${cost} credits for that (current: ${Math.floor(character.credits)})`,
      );
    }

    const effectiveStats = await this.getEffectiveStats(character);
    const resolution = resolveChoice(choice, effectiveStats);
    const effects = resolution.appliedEffects;

    const characterUpdates: Record<string, number> = {};
    if (cost > 0) {
      characterUpdates.credits = this.roundCredits(character.credits - cost);
    }
    if (effects.wantedDelta) {
      characterUpdates.wantedLevel = Math.max(0, character.wantedLevel + effects.wantedDelta);
    }
    if (effects.healthDelta) {
      characterUpdates.health = Math.min(
        character.maxHealth,
        Math.max(0, character.health + effects.healthDelta),
      );
    }
    if (Object.keys(characterUpdates).length > 0) {
      await this.prisma.character.update({ where: { id: character.id }, data: characterUpdates });
    }

    const record: DecisionRecord = {
      minute,
      choiceId,
      checkRoll: resolution.checkRoll,
      checkTotal: resolution.checkTotal,
      checkDc: resolution.checkDc,
      checkPassed: resolution.checkPassed,
      appliedEffects: effects,
      decidedAt: new Date().toISOString(),
    };

    const updatedInstance = await this.prisma.opportunityInstance.update({
      where: { id: instanceId },
      data: {
        progress: { ...progress, decisions: [...decisions, record] } as never,
      },
      include: { definition: true },
    });

    if (character.playerId) {
      const checkNote =
        resolution.checkPassed === undefined
          ? ''
          : resolution.checkPassed
            ? ' (check passed)'
            : ' (check failed)';
      await this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId: character.id,
          type: 'DECISION_MADE',
          message: `${character.name} made a call during ${instance.definition.title}: ${choice.label}${checkNote}`,
          relatedEntities: { instanceId, minute, choiceId, decision: record as never },
        },
      });
    }

    return { instance: updatedInstance, decision: record };
  }

  async resolveInstanceInternal(instance: any) {
    const { definition, character } = instance;
    const now = new Date();

    if (this.isRestDefinitionId(definition.id)) {
      return this.resolveRestInstanceInternal(instance, now, false);
    }

    const relationshipChanges: Array<{
      targetType: string;
      targetId: string;
      relationshipType: RelationshipType;
      delta: number;
    }> = [];

    const rulesCharacter = await this.getEffectiveStats(character);
    const rulesDefinition = this.toGameRulesOpportunity(definition);
    const plannedOutcome = this.readPlannedOutcome(instance.progress);
    const successChance =
      plannedOutcome?.successChance ??
      calculateOpportunitySuccessChance(rulesCharacter, rulesDefinition);
    const check = plannedOutcome
      ? {
          success: plannedOutcome.success,
          d20Roll: plannedOutcome.roll,
          checkTotal: plannedOutcome.checkTotal,
          difficultyClass: plannedOutcome.difficultyClass,
          statModifier: plannedOutcome.statModifier,
          relevantStatTotal: plannedOutcome.relevantStatTotal,
        }
      : rollOpportunityCheck(rulesCharacter, rulesDefinition);
    const checkProfile = getOpportunityCheckProfile(rulesCharacter, rulesDefinition);

    // Mid-activity decisions can shift the final result either way.
    const decisions = this.readProgress(instance.progress)?.decisions ?? [];
    const decisionRollBonus = totalDecisionRollBonus(decisions);
    const decisionCreditsBonus = totalDecisionCreditsBonus(decisions);
    const finalCheck = computeFinalSuccess(
      {
        roll: check.d20Roll,
        checkTotal: check.checkTotal,
        difficultyClass: check.difficultyClass,
      },
      decisionRollBonus,
    );
    const success = decisionRollBonus !== 0 ? finalCheck.success : check.success;

    const rewards = definition.rewards as any[];
    const risks = definition.risks as any[];
    const appliedRewards: any[] = [];
    const appliedRisks: any[] = [];

    const characterUpdates: any = {};

    if (success && decisionCreditsBonus > 0) {
      characterUpdates.credits = this.roundCredits(
        (character.credits ?? 0) + decisionCreditsBonus,
      );
      appliedRewards.push({ type: 'CREDITS', value: decisionCreditsBonus, source: 'DECISION' });
    }

    if (success) {
      for (const reward of rewards) {
        if (reward.type === 'CREDITS') {
          const currentCredits = characterUpdates.credits ?? character.credits ?? 0;
          characterUpdates.credits = currentCredits + (reward.value ?? 0);
          appliedRewards.push(reward);
        } else if (reward.type === 'STAT_XP') {
          const currentVal = characterUpdates[reward.key] ?? character[reward.key] ?? 0;
          if (Math.random() < STAT_XP_GAIN_PROBABILITY && currentVal < STAT_CAP) {
            characterUpdates[reward.key] = Math.min(STAT_CAP, currentVal + 1);
          }
          appliedRewards.push(reward);
        } else if (reward.type === 'ITEM' && typeof reward.itemDefinitionId === 'string') {
          const grantedItem = await this.prisma.itemDefinition.findUnique({
            where: { id: reward.itemDefinitionId },
            select: { id: true, name: true },
          });
          if (!grantedItem) {
            continue;
          }
          const itemInstance = await this.prisma.itemInstance.create({
            data: {
              itemDefinitionId: grantedItem.id,
              ownerType: 'CHARACTER',
              ownerId: character.id,
            },
          });
          appliedRewards.push({
            ...reward,
            itemDefinitionId: grantedItem.id,
            itemInstanceId: itemInstance.id,
            itemName: grantedItem.name,
          });
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
              const currentWantedLevel = characterUpdates.wantedLevel ?? character.wantedLevel ?? 0;
              characterUpdates.wantedLevel = Math.max(
                0,
                currentWantedLevel + consequence.value,
              );
              appliedRisks.push(consequence);
            } else if (consequence.type === 'MODIFY_STAT' && consequence.key === 'health') {
              const currentHealth = characterUpdates.health ?? character.health ?? 100;
              characterUpdates.health = Math.max(0, currentHealth + consequence.value);
              appliedRisks.push(consequence);
            } else if (consequence.type === 'MODIFY_STAT' && consequence.key === 'energy') {
              const currentEnergy = characterUpdates.energy ?? character.energy ?? 0;
              characterUpdates.energy = Math.min(
                character.maxEnergy ?? 100,
                Math.max(0, currentEnergy + consequence.value),
              );
              appliedRisks.push(consequence);
            } else if (consequence.type === 'MODIFY_CREDITS') {
              const currentCredits = characterUpdates.credits ?? character.credits ?? 0;
              characterUpdates.credits = Math.max(
                0,
                this.roundCredits(currentCredits + (consequence.value ?? 0)),
              );
              appliedRisks.push(consequence);
            } else if (
              consequence.type === 'MODIFY_FACTION_REPUTATION' &&
              typeof consequence.factionId === 'string'
            ) {
              await this.upsertRelationship(
                'CHARACTER',
                character.id,
                'FACTION',
                consequence.factionId,
                'REPUTATION',
                consequence.value ?? 0,
              );
              relationshipChanges.push({
                targetType: 'FACTION',
                targetId: consequence.factionId,
                relationshipType: RelationshipType.REPUTATION,
                delta: consequence.value ?? 0,
              });
              appliedRisks.push(consequence);
            } else if (
              consequence.type === 'MODIFY_CORPORATION_REPUTATION' &&
              typeof consequence.corporationId === 'string'
            ) {
              await this.upsertRelationship(
                'CHARACTER',
                character.id,
                'CORPORATION',
                consequence.corporationId,
                'REPUTATION',
                consequence.value ?? 0,
              );
              relationshipChanges.push({
                targetType: 'CORPORATION',
                targetId: consequence.corporationId,
                relationshipType: RelationshipType.REPUTATION,
                delta: consequence.value ?? 0,
              });
              appliedRisks.push(consequence);
            }
          }
        }
      }
    }

    const xpGained = xpRewardForOpportunity(
      { difficulty: definition.difficulty ?? 10, kind: definition.kind },
      success,
    );
    const progression = applyXpGain(
      { xp: character.xp ?? 0, level: character.level ?? 1 },
      xpGained,
    );
    characterUpdates.xp = progression.xp;
    if (progression.levelsGained > 0) {
      characterUpdates.level = progression.level;
      characterUpdates.unspentStatPoints =
        (character.unspentStatPoints ?? 0) + progression.statPointsGained;
      characterUpdates.maxHealth = (character.maxHealth ?? 100) + progression.maxHealthGained;
      characterUpdates.maxEnergy = (character.maxEnergy ?? 100) + progression.maxEnergyGained;
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
      roll: check.d20Roll,
      successChance: Math.round(successChance * 100) / 100,
      checkTotal: check.checkTotal,
      difficultyClass: check.difficultyClass,
      statModifier: Number(check.statModifier.toFixed(1)),
      relevantStatTotal: check.relevantStatTotal,
      checkLabel: checkProfile.label,
      appliedRewards,
      appliedRisks,
      decisionSummary:
        decisions.length > 0
          ? {
              count: decisions.length,
              rollBonus: decisionRollBonus,
              creditsBonus: decisionCreditsBonus,
              adjustedTotal: finalCheck.adjustedTotal,
              rescued: decisionRollBonus !== 0 && finalCheck.success && !check.success,
            }
          : null,
      progression: {
        xpGained,
        totalXp: progression.xp,
        level: progression.level,
        levelsGained: progression.levelsGained,
        statPointsGained: progression.statPointsGained,
      },
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
        progress: {
          ...(this.readProgress(instance.progress) ?? {}),
          plannedOutcome:
            plannedOutcome ?? {
              success,
              roll: check.d20Roll,
              successChance: Math.round(successChance * 100) / 100,
              checkTotal: check.checkTotal,
              difficultyClass: check.difficultyClass,
              statModifier: Number(check.statModifier.toFixed(1)),
              relevantStatTotal: check.relevantStatTotal,
              checkLabel: checkProfile.label,
            },
        } as never,
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

      if (progression.levelsGained > 0) {
        await this.prisma.activityLog.create({
          data: {
            playerId: character.playerId,
            characterId: character.id,
            type: 'LEVEL_UP',
            message: `${character.name} reached level ${progression.level}! +${progression.statPointsGained} stat points`,
            relatedEntities: { instanceId: instance.id, level: progression.level },
          },
        });
      }
    }

    return updatedInstance;
  }

  async startRestActivity(
    character: {
      id: string;
      name: string;
      playerId?: string | null;
      credits: number;
      energy: number;
      maxEnergy: number;
      health: number;
      maxHealth: number;
      wantedLevel: number;
    },
    profile: RestProfileInput,
  ) {
    const existing = await this.prisma.opportunityInstance.findFirst({
      where: {
        characterId: character.id,
        definitionId: REST_OPPORTUNITY_ID,
        status: { in: ['IN_PROGRESS', 'ACCEPTED'] },
      },
      include: { definition: true },
    });
    if (existing) {
      return existing;
    }

    const activeOther = await this.prisma.opportunityInstance.findFirst({
      where: {
        characterId: character.id,
        status: { in: ['IN_PROGRESS', 'ACCEPTED'] },
      },
      include: { definition: { select: { title: true } } },
    });
    if (activeOther) {
      throw new BadRequestException(
        `You already have an activity in progress: ${activeOther.definition.title}. Finish it before resting.`,
      );
    }

    const energyMinutes =
      profile.energyPerMinute > 0
        ? Math.ceil(Math.max(0, character.maxEnergy - character.energy) / profile.energyPerMinute)
        : 0;
    const healthMinutes =
      profile.healthPerMinute > 0
        ? Math.ceil(Math.max(0, character.maxHealth - character.health) / profile.healthPerMinute)
        : 0;
    const wantedMinutes =
      profile.wantedReductionPerMinute > 0
        ? Math.ceil(character.wantedLevel / profile.wantedReductionPerMinute)
        : 0;
    const durationMinutes = Math.max(energyMinutes, healthMinutes, wantedMinutes);

    if (durationMinutes <= 0) {
      throw new BadRequestException('You are already fully rested here');
    }

    const estimatedCost = this.roundCredits(durationMinutes * profile.costPerMinute);
    if (character.credits < estimatedCost) {
      throw new BadRequestException(
        `A full rest here can cost up to ${estimatedCost} credits (you have ${character.credits})`,
      );
    }

    await this.ensureRestDefinition();

    const now = new Date();
    const completesAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const progress: OpportunityProgress = {
      rest: {
        ...profile,
        durationMinutes,
        targetEnergy: character.maxEnergy,
        targetHealth: character.maxHealth,
        targetWantedLevel: 0,
      },
    };

    const instance = await this.prisma.opportunityInstance.create({
      data: {
        definitionId: REST_OPPORTUNITY_ID,
        characterId: character.id,
        status: 'IN_PROGRESS',
        startedAt: now,
        completesAt,
        progress: progress as never,
      },
      include: { definition: true },
    });

    if (character.playerId) {
      await this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId: character.id,
          type: 'BUILDING_ENTERED',
          message: `${character.name} started resting at ${profile.buildingName}`,
          relatedEntities: {
            buildingId: profile.buildingId,
            instanceId: instance.id,
            estimatedCost,
            durationMinutes,
            rest: profile,
          },
        },
      });
    }

    return instance;
  }

  async interruptActiveRest(characterId: string, playerId: string, reason = 'manual') {
    const instance = await this.prisma.opportunityInstance.findFirst({
      where: {
        characterId,
        definitionId: REST_OPPORTUNITY_ID,
        status: { in: ['IN_PROGRESS', 'ACCEPTED'] },
      },
      include: { definition: true, character: true },
    });

    if (!instance) {
      return null;
    }
    if (instance.character.playerId !== playerId) {
      throw new ForbiddenException('You can only stop rest for your own character');
    }

    return this.resolveRestInstanceInternal(instance, new Date(), true, reason);
  }

  private readTimelineEvents(value: unknown): OpportunityTimelineEvent[] {
    if (value == null) {
      return [];
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('timelineEvents must be an array');
    }

    return value.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new BadRequestException(`timelineEvents[${index}] must be an object`);
      }
      const record = entry as Record<string, unknown>;
      if (typeof record.minute !== 'number' || !Number.isFinite(record.minute) || record.minute < 0) {
        throw new BadRequestException(`timelineEvents[${index}].minute must be a non-negative number`);
      }

      const description =
        typeof record.description === 'string' && record.description.trim().length > 0
          ? record.description.trim()
          : undefined;
      const successDescription =
        typeof record.successDescription === 'string' &&
        record.successDescription.trim().length > 0
          ? record.successDescription.trim()
          : undefined;
      const failureDescription =
        typeof record.failureDescription === 'string' &&
        record.failureDescription.trim().length > 0
          ? record.failureDescription.trim()
          : undefined;

      if (!description && !successDescription && !failureDescription) {
        throw new BadRequestException(
          `timelineEvents[${index}] must include description, successDescription, or failureDescription`,
        );
      }

      return {
        minute: record.minute,
        ...(description ? { description } : {}),
        ...(successDescription ? { successDescription } : {}),
        ...(failureDescription ? { failureDescription } : {}),
      };
    });
  }

  private async ensureRestDefinition() {
    await this.prisma.opportunityDefinition.upsert({
      where: { id: REST_OPPORTUNITY_ID },
      update: {
        title: 'Recovery Cycle',
        description: 'Pull back, breathe, and let the minutes recover what they can.',
        acceptedDescription:
          'Recovery is underway. You can stop at any time and keep the energy and health regained so far.',
        kind: 'GIG',
        type: 'WORLD',
        difficulty: 8,
        durationMinutes: 1,
        rewards: [] as never,
        risks: [] as never,
        timelineEvents: [
          { minute: 1, description: 'Your breathing steadies as the rush starts to leave your body.' },
          { minute: 5, description: 'Fatigue starts to lift and the background noise fades.' },
          { minute: 10, description: 'Your pulse evens out and your focus returns in full.' },
        ] as never,
        repeatability: { hiddenFromBoard: true, systemActivity: 'REST' } as never,
      },
      create: {
        id: REST_OPPORTUNITY_ID,
        title: 'Recovery Cycle',
        description: 'Pull back, breathe, and let the minutes recover what they can.',
        acceptedDescription:
          'Recovery is underway. You can stop at any time and keep the energy and health regained so far.',
        kind: 'GIG',
        postedByType: 'SYSTEM',
        type: 'WORLD',
        requirements: [] as never,
        durationMinutes: 1,
        difficulty: 8,
        rewards: [] as never,
        risks: [] as never,
        timelineEvents: [
          { minute: 1, description: 'Your breathing steadies as the rush starts to leave your body.' },
          { minute: 5, description: 'Fatigue starts to lift and the background noise fades.' },
          { minute: 10, description: 'Your pulse evens out and your focus returns in full.' },
        ] as never,
        possibleEventIds: [] as never,
        repeatability: { hiddenFromBoard: true, systemActivity: 'REST' } as never,
      },
    });
  }

  private isRestDefinitionId(definitionId: string) {
    return definitionId === REST_OPPORTUNITY_ID;
  }

  private isHiddenSystemOpportunity(definition: { id: string; repeatability?: unknown }) {
    if (definition.id === REST_OPPORTUNITY_ID) {
      return true;
    }
    if (!definition.repeatability || typeof definition.repeatability !== 'object') {
      return false;
    }
    const repeatability = definition.repeatability as Record<string, unknown>;
    return Boolean(repeatability.hiddenFromBoard);
  }

  private async resolveRestInstanceInternal(
    instance: any,
    finishedAt: Date,
    interrupted: boolean,
    reason?: string,
  ) {
    const rest = this.readProgress(instance.progress)?.rest;
    if (!rest) {
      throw new BadRequestException('Rest progress is missing recovery settings');
    }

    const totalMinutes = Math.max(1, rest.durationMinutes);
    const elapsedMs = Math.max(0, finishedAt.getTime() - new Date(instance.startedAt).getTime());
    const elapsedMinutes = interrupted
      ? Math.min(totalMinutes, Math.floor(elapsedMs / 60_000))
      : totalMinutes;
    const billableMinutes = Math.max(0, elapsedMinutes);
    const energyRecovered = Math.min(
      Math.max(0, rest.targetEnergy - instance.character.energy),
      Math.floor(billableMinutes * rest.energyPerMinute),
    );
    const healthRecovered = Math.min(
      Math.max(0, rest.targetHealth - instance.character.health),
      Math.floor(billableMinutes * rest.healthPerMinute),
    );
    const wantedReduction = Math.min(
      Math.max(0, instance.character.wantedLevel - rest.targetWantedLevel),
      Math.floor(billableMinutes * rest.wantedReductionPerMinute),
    );
    const cost = this.roundCredits(billableMinutes * rest.costPerMinute);

    const updatedCharacter = await this.prisma.character.update({
      where: { id: instance.character.id },
      data: {
        credits: instance.character.credits - cost,
        energy: Math.min(instance.character.maxEnergy, instance.character.energy + energyRecovered),
        health: Math.min(instance.character.maxHealth, instance.character.health + healthRecovered),
        wantedLevel: Math.max(0, instance.character.wantedLevel - wantedReduction),
        ...(energyRecovered > 0 ? { lastEnergyDecayAt: finishedAt } : {}),
      },
    });

    const outcome = {
      success: true,
      interrupted,
      interruptionReason: interrupted ? reason ?? 'manual' : null,
      minutesRested: billableMinutes,
      energyRecovered,
      healthRecovered,
      cost,
      wantedDelta: -wantedReduction,
      buildingId: rest.buildingId,
      buildingName: rest.buildingName,
      resolvedAt: finishedAt.toISOString(),
      characterLedger: {
        before: {
          credits: instance.character.credits,
          health: instance.character.health,
          energy: instance.character.energy,
          wantedLevel: instance.character.wantedLevel,
        },
        after: {
          credits: updatedCharacter.credits,
          health: updatedCharacter.health,
          energy: updatedCharacter.energy,
          wantedLevel: updatedCharacter.wantedLevel,
        },
        delta: {
          credits: updatedCharacter.credits - instance.character.credits,
          health: updatedCharacter.health - instance.character.health,
          energy: updatedCharacter.energy - instance.character.energy,
          wantedLevel: updatedCharacter.wantedLevel - instance.character.wantedLevel,
        },
      },
    };

    const updatedInstance = await this.prisma.opportunityInstance.update({
      where: { id: instance.id },
      data: {
        status: 'COMPLETED',
        completedAt: finishedAt,
        outcome,
      },
      include: { definition: true },
    });

    if (instance.character.playerId) {
      await this.prisma.activityLog.create({
        data: {
          playerId: instance.character.playerId,
          characterId: instance.character.id,
          type: 'BUILDING_ENTERED',
          message: interrupted
            ? `${instance.character.name} stopped resting at ${rest.buildingName} after ${billableMinutes}m (+${energyRecovered} EN, +${healthRecovered} HP)`
            : `${instance.character.name} finished resting at ${rest.buildingName} (+${energyRecovered} EN, +${healthRecovered} HP)`,
          relatedEntities: {
            instanceId: instance.id,
            buildingId: rest.buildingId,
            outcome,
          },
        },
      });
    }

    return updatedInstance;
  }

  private roundCredits(value: number) {
    return Number(value.toFixed(2));
  }

  private planOutcome(rulesCharacter: CharacterStats, definition: any): PlannedOutcome {
    const rulesDefinition = this.toGameRulesOpportunity(definition);
    const successChance = calculateOpportunitySuccessChance(rulesCharacter, rulesDefinition);
    const check = rollOpportunityCheck(rulesCharacter, rulesDefinition);
    const checkProfile = getOpportunityCheckProfile(rulesCharacter, rulesDefinition);

    return {
      success: check.success,
      roll: check.d20Roll,
      successChance: Math.round(successChance * 100) / 100,
      checkTotal: check.checkTotal,
      difficultyClass: check.difficultyClass,
      statModifier: Number(check.statModifier.toFixed(1)),
      relevantStatTotal: check.relevantStatTotal,
      checkLabel: checkProfile.label,
    };
  }

  private readProgress(progress: unknown): OpportunityProgress | null {
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      return null;
    }
    return progress as OpportunityProgress;
  }

  private readPlannedOutcome(progress: unknown): PlannedOutcome | null {
    const parsed = this.readProgress(progress);
    if (!parsed?.plannedOutcome || typeof parsed.plannedOutcome !== 'object') {
      return null;
    }
    return parsed.plannedOutcome;
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
    const [relationships, completedQuestInstances, inventoryItems, locationInfo] =
      await Promise.all([
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
      this.prisma.itemInstance.findMany({
        where: { ownerType: 'CHARACTER', ownerId: characterId },
        select: { id: true, itemDefinitionId: true },
      }),
      this.prisma.character.findUnique({
        where: { id: characterId },
        select: { currentPlanetId: true, currentDistrictId: true },
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

    // ITEM_REQUIRED requirements may reference either an item definition id
    // or a specific item instance id, so expose both.
    const inventoryItemIds = [
      ...new Set(inventoryItems.flatMap((item) => [item.itemDefinitionId, item.id])),
    ];

    return {
      factionReputations,
      corporationReputations,
      completedQuestIds: completedQuestInstances.map((instance) => instance.definitionId),
      inventoryItemIds,
      // PLANET_ACCESS / DISTRICT_ACCESS requirements mean "you must be
      // there right now" — location-gated content.
      accessiblePlanetIds: locationInfo?.currentPlanetId ? [locationInfo.currentPlanetId] : [],
      accessibleDistrictIds: locationInfo?.currentDistrictId
        ? [locationInfo.currentDistrictId]
        : [],
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

  /**
   * Base stats plus bonuses from equipped gear — the numbers every
   * requirement check and d20 roll should use.
   */
  private async getEffectiveStats(character: Record<string, unknown>): Promise<CharacterStats> {
    const equipped = await this.prisma.itemInstance.findMany({
      where: {
        ownerType: 'CHARACTER',
        ownerId: String(character.id),
        equippedSlot: { not: null },
      },
      include: { itemDefinition: true },
    });
    const bonuses = aggregateEquipmentBonuses(
      equipped.map((item: any) => item.itemDefinition).filter(Boolean),
    );
    return applyEquipmentBonuses(this.toCharacterStats(character), bonuses);
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
      level: Number(character.level ?? 1),
    };
  }

  private toGameRulesOpportunity(
    definition: Record<string, unknown>,
  ): GameRulesOpportunityDefinition {
    return {
      id: String(definition.id),
      title: String(definition.title),
      kind: definition.kind as GameRulesOpportunityDefinition['kind'],
      type: definition.type as GameRulesOpportunityDefinition['type'],
      difficulty: Number(definition.difficulty ?? 10),
      requirements: this.readRequirements(definition.requirements),
      rewards: this.readRewards(definition.rewards),
      risks: this.readRisks(definition.risks),
      durationMinutes:
        typeof definition.durationMinutes === 'number' ? definition.durationMinutes : undefined,
    };
  }

  private readRequirements(value: unknown): Requirement[] {
    return Array.isArray(value) ? (value as Requirement[]) : [];
  }

  private readRewards(value: unknown): GameRulesReward[] {
    return Array.isArray(value) ? (value as GameRulesReward[]) : [];
  }

  private readRisks(value: unknown): GameRulesRisk[] {
    return Array.isArray(value) ? (value as GameRulesRisk[]) : [];
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
      case 'LEVEL_MIN':
        return `Requirement not met: level must be >= ${requirement.value} (current: ${character.level ?? 1})`;
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
      case 'ITEM_REQUIRED':
        return `Requirement not met: you need ${requirement.name ?? 'a specific item'} in your inventory`;
      case 'PLANET_ACCESS':
        return `Requirement not met: you must be on ${requirement.name ?? 'a specific planet'}`;
      case 'DISTRICT_ACCESS':
        return `Requirement not met: you must be in ${requirement.name ?? 'a specific district'}`;
      default:
        return `Requirement not met: ${requirement.type}`;
    }
  }
}
