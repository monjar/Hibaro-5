import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import { ActivityType, PrismaClient } from '@prisma/client';
import { calculateOpportunitySuccessChance, OpportunityDefinition } from '@heliora/game-rules';

const prisma = new PrismaClient();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const parsedUrl = new URL(REDIS_URL);
const redisConnection = {
  host: parsedUrl.hostname || 'localhost',
  port: parseInt(parsedUrl.port || '6379'),
};

export const opportunityQueue = new Queue('opportunity-resolution', {
  connection: redisConnection,
});

async function resolveOpportunityInstance(instanceId: string) {
  const instance = await prisma.opportunityInstance.findUnique({
    where: { id: instanceId },
    include: { definition: true, character: true },
  });

  if (!instance) {
    console.log(`[Worker] Instance ${instanceId} not found`);
    return;
  }

  if (instance.status === 'COMPLETED' || instance.status === 'FAILED') {
    console.log(`[Worker] Instance ${instanceId} already resolved (${instance.status})`);
    return;
  }

  const { definition, character } = instance;
  const rulesDefinition: OpportunityDefinition = {
    ...definition,
    durationMinutes: definition.durationMinutes ?? undefined,
    requirements: Array.isArray(definition.requirements)
      ? (definition.requirements as unknown as OpportunityDefinition['requirements'])
      : [],
    rewards: Array.isArray(definition.rewards)
      ? (definition.rewards as unknown as OpportunityDefinition['rewards'])
      : [],
    risks: Array.isArray(definition.risks)
      ? (definition.risks as unknown as OpportunityDefinition['risks'])
      : [],
  };
  const successChance = calculateOpportunitySuccessChance(character, rulesDefinition);
  const roll = Math.random();
  const success = roll <= successChance;

  const rewards = definition.rewards as any[];
  const risks = definition.risks as any[];
  const characterUpdates: any = {};
  const appliedRewards: any[] = [];
  const appliedRisks: any[] = [];

  if (success) {
    for (const reward of rewards) {
      if (reward.type === 'CREDITS') {
        characterUpdates.credits = (character.credits || 0) + reward.value;
        appliedRewards.push(reward);
      } else if (reward.type === 'STAT_XP') {
        if (Math.random() < 0.5 && reward.key) {
          characterUpdates[reward.key] =
            ((character[reward.key as keyof typeof character] || 0) as number) + 1;
        }
        appliedRewards.push(reward);
      }
    }
  } else {
    for (const risk of risks) {
      if (Math.random() < (risk.probability || 0.3)) {
        for (const consequence of risk.consequences || []) {
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
    await prisma.character.update({ where: { id: character.id }, data: characterUpdates });
  }

  const outcome = {
    success,
    roll: Math.round(roll * 100) / 100,
    successChance: Math.round(successChance * 100) / 100,
    appliedRewards,
    appliedRisks,
    resolvedAt: new Date().toISOString(),
    resolvedBy: 'worker',
  };

  await prisma.opportunityInstance.update({
    where: { id: instanceId },
    data: {
      status: success ? 'COMPLETED' : 'FAILED',
      completedAt: new Date(),
      outcome,
    },
  });

  if (character.playerId) {
    const kind = definition.kind;
    const activityType: ActivityType = success
      ? kind === 'GIG'
        ? 'GIG_COMPLETED'
        : kind === 'QUEST'
          ? 'QUEST_COMPLETED'
          : 'JOB_COMPLETED'
      : 'GIG_FAILED';
    await prisma.activityLog.create({
      data: {
        playerId: character.playerId,
        characterId: character.id,
        type: activityType,
        message: success
          ? `${character.name} completed: ${definition.title} (worker)`
          : `${character.name} failed: ${definition.title} (worker)`,
        relatedEntities: { instanceId, outcome },
      },
    });
  }

  console.log(`[Worker] Resolved instance ${instanceId}: ${success ? 'SUCCESS' : 'FAILED'}`);
}

const worker = new Worker(
  'opportunity-resolution',
  async (job) => {
    const { instanceId } = job.data;
    await resolveOpportunityInstance(instanceId);
  },
  { connection: redisConnection },
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
  console.log(`🔧 Heliora Worker running - listening on opportunity-resolution queue`);
  console.log(`   Redis: ${REDIS_URL}`);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
