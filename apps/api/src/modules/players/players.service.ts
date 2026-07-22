import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACHIEVEMENTS,
  AchievementProgressSnapshot,
  achievementProgress,
  applyXpGain,
  canClaimDaily,
  dailyRewardForStreak,
  isAchievementUnlocked,
  nextStreak,
} from '@heliora/game-rules';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedPlayer } from '../auth/auth.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async listAll() {
    const players = await this.prisma.player.findMany({
      orderBy: [{ isAdmin: 'desc' }, { lastLoginAt: 'desc' }, { createdAt: 'desc' }],
      include: { character: true },
    });

    return players.map((player) => this.sanitizePlayer(player));
  }

  async findByIdentifier(identifier: string, currentPlayer: AuthenticatedPlayer) {
    if (identifier !== currentPlayer.sub && identifier !== currentPlayer.username) {
      throw new ForbiddenException('You can only access your own player record');
    }

    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      include: { character: true },
    });
    if (!player) throw new NotFoundException(`Player ${identifier} not found`);

    return this.sanitizePlayer(player);
  }

  async updateAdminStatus(
    identifier: string,
    isAdmin: boolean,
    currentPlayer: AuthenticatedPlayer,
  ) {
    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      include: { character: true },
    });
    if (!player) {
      throw new NotFoundException(`Player ${identifier} not found`);
    }
    if (player.id === currentPlayer.sub && !isAdmin) {
      throw new BadRequestException('You cannot remove your own admin access from this screen');
    }

    const updated = await this.prisma.player.update({
      where: { id: player.id },
      data: { isAdmin },
      include: { character: true },
    });

    return this.sanitizePlayer(updated);
  }

  async getActivity(identifier: string, currentPlayer: AuthenticatedPlayer, page = 1, limit = 20) {
    const player = await this.findByIdentifier(identifier, currentPlayer);
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { playerId: player.id } }),
    ]);
    return { logs, total, page, limit };
  }

  private sanitizePlayer<T extends { passwordHash: string }>(player: T): Omit<T, 'passwordHash'> {
    const safePlayer: Partial<T> = { ...player };
    delete safePlayer.passwordHash;
    return safePlayer as Omit<T, 'passwordHash'>;
  }

  private async requireOwnPlayer(identifier: string, currentPlayer: AuthenticatedPlayer) {
    if (identifier !== currentPlayer.sub && identifier !== currentPlayer.username) {
      throw new ForbiddenException('You can only access your own player record');
    }
    const player = await this.prisma.player.findFirst({
      where: { OR: [{ id: identifier }, { username: identifier }] },
      include: { character: true },
    });
    if (!player) throw new NotFoundException(`Player ${identifier} not found`);
    return player;
  }

  /** Grant credits/XP to the player's character, resolving level-ups. */
  private async awardToCharacter(
    character: { id: string; credits: number; xp: number; level: number } & Record<
      string,
      unknown
    >,
    credits: number,
    xp: number,
  ) {
    const progression = applyXpGain({ xp: character.xp ?? 0, level: character.level ?? 1 }, xp);
    const data: Record<string, number> = {
      credits: Number((character.credits + credits).toFixed(2)),
      xp: progression.xp,
    };
    if (progression.levelsGained > 0) {
      data.level = progression.level;
      data.unspentStatPoints =
        Number(character.unspentStatPoints ?? 0) + progression.statPointsGained;
      data.maxHealth = Number(character.maxHealth ?? 100) + progression.maxHealthGained;
      data.maxEnergy = Number(character.maxEnergy ?? 100) + progression.maxEnergyGained;
    }
    await this.prisma.character.update({ where: { id: character.id }, data });
    return progression;
  }

  async getDailyStatus(identifier: string, currentPlayer: AuthenticatedPlayer) {
    const player = await this.requireOwnPlayer(identifier, currentPlayer);
    const lastClaim = await this.prisma.dailyClaim.findFirst({
      where: { playerId: player.id },
      orderBy: { claimedAt: 'desc' },
    });
    const now = new Date();
    const canClaim = canClaimDaily(lastClaim?.claimedAt ?? null, now);
    const upcomingStreak = nextStreak(lastClaim?.streak ?? 0, lastClaim?.claimedAt ?? null, now);
    return {
      canClaim,
      currentStreak: lastClaim?.streak ?? 0,
      nextStreak: canClaim ? upcomingStreak : lastClaim?.streak ?? 0,
      nextReward: dailyRewardForStreak(canClaim ? upcomingStreak : (lastClaim?.streak ?? 0) + 1),
      lastClaimAt: lastClaim?.claimedAt ?? null,
    };
  }

  async claimDaily(identifier: string, currentPlayer: AuthenticatedPlayer) {
    const player = await this.requireOwnPlayer(identifier, currentPlayer);
    if (!player.character) {
      throw new BadRequestException('You need a character to claim the daily supply drop');
    }
    const lastClaim = await this.prisma.dailyClaim.findFirst({
      where: { playerId: player.id },
      orderBy: { claimedAt: 'desc' },
    });
    const now = new Date();
    if (!canClaimDaily(lastClaim?.claimedAt ?? null, now)) {
      throw new BadRequestException('Already claimed today — come back tomorrow');
    }

    const streak = nextStreak(lastClaim?.streak ?? 0, lastClaim?.claimedAt ?? null, now);
    const reward = dailyRewardForStreak(streak);
    const progression = await this.awardToCharacter(
      player.character as never,
      reward.credits,
      reward.xp,
    );

    const claim = await this.prisma.dailyClaim.create({
      data: {
        playerId: player.id,
        streak,
        creditsAwarded: reward.credits,
        xpAwarded: reward.xp,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        playerId: player.id,
        characterId: player.character.id,
        type: 'DAILY_CLAIMED',
        message: `${player.character.name} claimed the daily supply drop: +$${reward.credits}, +${reward.xp} XP (streak ${streak})`,
        relatedEntities: { dailyClaimId: claim.id, streak },
      },
    });

    return {
      claim,
      reward,
      streak,
      levelUp:
        progression.levelsGained > 0
          ? { level: progression.level, statPointsGained: progression.statPointsGained }
          : null,
    };
  }

  private async buildAchievementSnapshot(playerId: string, characterId: string) {
    const [completedInstances, character, duelsWon, bountiesClaimed, itemsBought] =
      await Promise.all([
        this.prisma.opportunityInstance.findMany({
          where: { characterId, status: 'COMPLETED' },
          select: { definitionId: true, definition: { select: { kind: true } } },
        }),
        this.prisma.character.findUniqueOrThrow({
          where: { id: characterId },
          select: { level: true, credits: true },
        }),
        this.prisma.duel.count({ where: { winnerId: characterId } }),
        this.prisma.playerBounty.count({ where: { claimedById: characterId, status: 'CLAIMED' } }),
        this.prisma.activityLog.count({ where: { playerId, type: 'ITEM_BOUGHT' } }),
      ]);

    const quests = completedInstances.filter((entry) => entry.definition.kind === 'QUEST');
    const snapshot: AchievementProgressSnapshot = {
      completedActivities: completedInstances.length,
      completedGigs: completedInstances.filter((entry) => entry.definition.kind === 'GIG').length,
      completedQuests: quests.length,
      level: character.level ?? 1,
      credits: character.credits ?? 0,
      duelsWon,
      bountiesClaimed,
      itemsBought,
      completedQuestIds: quests.map((entry) => entry.definitionId),
    };
    return snapshot;
  }

  async getAchievements(identifier: string, currentPlayer: AuthenticatedPlayer) {
    const player = await this.requireOwnPlayer(identifier, currentPlayer);
    if (!player.character) return [];

    const [snapshot, records] = await Promise.all([
      this.buildAchievementSnapshot(player.id, player.character.id),
      this.prisma.achievementRecord.findMany({ where: { playerId: player.id } }),
    ]);
    const claimedIds = new Set(records.map((record) => record.achievementId));

    return ACHIEVEMENTS.map((definition) => ({
      id: definition.id,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      target: definition.target,
      progress: Math.min(definition.target, achievementProgress(definition, snapshot)),
      unlocked: isAchievementUnlocked(definition, snapshot),
      claimed: claimedIds.has(definition.id),
      rewardCredits: definition.rewardCredits,
      rewardXp: definition.rewardXp,
    }));
  }

  async claimAchievement(
    identifier: string,
    achievementId: string,
    currentPlayer: AuthenticatedPlayer,
  ) {
    const player = await this.requireOwnPlayer(identifier, currentPlayer);
    if (!player.character) {
      throw new BadRequestException('You need a character to claim achievements');
    }

    const definition = ACHIEVEMENTS.find((entry) => entry.id === achievementId);
    if (!definition) throw new NotFoundException(`Unknown achievement: ${achievementId}`);

    const existing = await this.prisma.achievementRecord.findUnique({
      where: { playerId_achievementId: { playerId: player.id, achievementId } },
    });
    if (existing) throw new BadRequestException('Achievement already claimed');

    const snapshot = await this.buildAchievementSnapshot(player.id, player.character.id);
    if (!isAchievementUnlocked(definition, snapshot)) {
      throw new BadRequestException('Achievement not unlocked yet');
    }

    const progression = await this.awardToCharacter(
      player.character as never,
      definition.rewardCredits,
      definition.rewardXp,
    );

    const record = await this.prisma.achievementRecord.create({
      data: {
        playerId: player.id,
        achievementId,
        creditsAwarded: definition.rewardCredits,
        xpAwarded: definition.rewardXp,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        playerId: player.id,
        characterId: player.character.id,
        type: 'ACHIEVEMENT_EARNED',
        message: `${player.character.name} earned the achievement "${definition.title}" (+$${definition.rewardCredits}, +${definition.rewardXp} XP)`,
        relatedEntities: { achievementId },
      },
    });

    return {
      record,
      reward: { credits: definition.rewardCredits, xp: definition.rewardXp },
      levelUp:
        progression.levelsGained > 0
          ? { level: progression.level, statPointsGained: progression.statPointsGained }
          : null,
    };
  }
}
