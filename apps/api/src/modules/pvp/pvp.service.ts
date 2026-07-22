import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BOUNTY_CLAIM_ENERGY_COST,
  BOUNTY_FAILED_CLAIM_HEALTH_LOSS,
  BOUNTY_MIN_AMOUNT,
  BOUNTY_TARGET_HEALTH_LOSS,
  CharacterStats,
  DUEL_ATTACKER_COOLDOWN_MS,
  DUEL_ENERGY_COST,
  DUEL_HEAT_LAW_LEVEL,
  DUEL_LOSER_HEALTH_LOSS,
  DUEL_MAX_WAGER,
  DUEL_MIN_WAGER,
  DUEL_TARGET_COOLDOWN_MS,
  DUEL_WINNER_HEALTH_LOSS,
  PVP_MIN_LEVEL,
  aggregateEquipmentBonuses,
  applyEquipmentBonuses,
  duelTransferAmount,
  rollBountyClaim,
  rollDuel,
} from '@heliora/game-rules';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PvpService {
  constructor(private prisma: PrismaService) {}

  private async getOwnedCharacter(characterId: string, playerId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { currentDistrict: true },
    });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only act with your own character');
    }
    return character;
  }

  private toStats(character: any): CharacterStats {
    return {
      id: character.id,
      name: character.name,
      credits: character.credits ?? 0,
      health: character.health ?? 0,
      maxHealth: character.maxHealth ?? 100,
      energy: character.energy ?? 0,
      maxEnergy: character.maxEnergy ?? 100,
      wantedLevel: character.wantedLevel ?? 0,
      strength: character.strength ?? 0,
      agility: character.agility ?? 0,
      intelligence: character.intelligence ?? 0,
      charisma: character.charisma ?? 0,
      hacking: character.hacking ?? 0,
      combat: character.combat ?? 0,
      stealth: character.stealth ?? 0,
      engineering: character.engineering ?? 0,
      reputation: character.reputation ?? 0,
      level: character.level ?? 1,
    };
  }

  private async getEffectiveStats(character: any): Promise<CharacterStats> {
    const equipped = await this.prisma.itemInstance.findMany({
      where: { ownerType: 'CHARACTER', ownerId: character.id, equippedSlot: { not: null } },
      include: { itemDefinition: true },
    });
    const bonuses = aggregateEquipmentBonuses(
      equipped.map((item) => item.itemDefinition).filter(Boolean),
    );
    return applyEquipmentBonuses(this.toStats(character), bonuses);
  }

  private assertPvpEligible(character: { level: number; name: string }, role: string) {
    if ((character.level ?? 1) < PVP_MIN_LEVEL) {
      throw new BadRequestException(
        `${character.name} is below level ${PVP_MIN_LEVEL} and is protected from PVP (${role}).`,
      );
    }
  }

  /** Player characters sharing your district — potential duel targets. */
  async playersNearby(characterId: string, playerId: string) {
    const character = await this.getOwnedCharacter(characterId, playerId);
    if (!character.currentDistrictId) return [];

    const players = await this.prisma.character.findMany({
      where: {
        type: 'PLAYER',
        currentDistrictId: character.currentDistrictId,
        id: { not: characterId },
      },
      select: { id: true, name: true, level: true, wantedLevel: true },
      orderBy: { level: 'desc' },
      take: 50,
    });

    return players.map((player) => ({
      ...player,
      pvpProtected: (player.level ?? 1) < PVP_MIN_LEVEL,
    }));
  }

  async startDuel(playerId: string, characterId: string, targetId: string, wager: number) {
    if (characterId === targetId) {
      throw new BadRequestException('You cannot duel yourself');
    }
    if (!Number.isFinite(wager) || wager < DUEL_MIN_WAGER || wager > DUEL_MAX_WAGER) {
      throw new BadRequestException(
        `Wager must be between ${DUEL_MIN_WAGER} and ${DUEL_MAX_WAGER} credits`,
      );
    }

    const [attacker, defender] = await Promise.all([
      this.getOwnedCharacter(characterId, playerId),
      this.prisma.character.findUnique({
        where: { id: targetId },
        include: { currentDistrict: true },
      }),
    ]);
    if (!defender) throw new NotFoundException('Target not found');
    if (defender.type !== 'PLAYER') {
      throw new BadRequestException('You can only duel other players');
    }

    this.assertPvpEligible(attacker, 'attacker');
    this.assertPvpEligible(defender, 'target');

    if (!attacker.currentDistrictId || attacker.currentDistrictId !== defender.currentDistrictId) {
      throw new BadRequestException('You must be in the same district as your target');
    }
    if (attacker.energy < DUEL_ENERGY_COST) {
      throw new BadRequestException(
        `Dueling costs ${DUEL_ENERGY_COST} energy (you have ${attacker.energy})`,
      );
    }
    if (attacker.credits < wager) {
      throw new BadRequestException('You cannot wager credits you do not have');
    }

    const now = Date.now();
    const [recentAny, recentSameTarget] = await Promise.all([
      this.prisma.duel.findFirst({
        where: { attackerId: characterId, createdAt: { gte: new Date(now - DUEL_ATTACKER_COOLDOWN_MS) } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.duel.findFirst({
        where: {
          attackerId: characterId,
          defenderId: targetId,
          createdAt: { gte: new Date(now - DUEL_TARGET_COOLDOWN_MS) },
        },
      }),
    ]);
    if (recentAny) {
      const readyAt = new Date(recentAny.createdAt).getTime() + DUEL_ATTACKER_COOLDOWN_MS;
      const minutes = Math.max(1, Math.ceil((readyAt - now) / 60000));
      throw new BadRequestException(`You are still recovering — next duel in ~${minutes}m`);
    }
    if (recentSameTarget) {
      throw new BadRequestException('You already fought this operator recently. Give it an hour.');
    }

    const [attackerStats, defenderStats] = await Promise.all([
      this.getEffectiveStats(attacker),
      this.getEffectiveStats(defender),
    ]);
    const contest = rollDuel(attackerStats, defenderStats);

    const attackerWins = contest.attackerWins;
    const winner = attackerWins ? attacker : defender;
    const loser = attackerWins ? defender : attacker;
    const transfer = duelTransferAmount(wager, loser.credits);

    const districtLaw = attacker.currentDistrict?.lawLevel ?? 0;
    const attackerHeat = districtLaw >= DUEL_HEAT_LAW_LEVEL ? 1 : 0;

    const attackerHealthLoss = attackerWins ? DUEL_WINNER_HEALTH_LOSS : DUEL_LOSER_HEALTH_LOSS;
    const defenderHealthLoss = attackerWins ? DUEL_LOSER_HEALTH_LOSS : DUEL_WINNER_HEALTH_LOSS;

    const [duel] = await this.prisma.$transaction([
      this.prisma.duel.create({
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          districtId: attacker.currentDistrictId,
          wagerCredits: wager,
          attackerRoll: contest.attacker.roll,
          attackerTotal: contest.attacker.total,
          defenderRoll: contest.defender.roll,
          defenderTotal: contest.defender.total,
          winnerId: winner.id,
          creditsTransferred: transfer,
        },
      }),
      this.prisma.character.update({
        where: { id: attacker.id },
        data: {
          credits: attacker.credits + (attackerWins ? transfer : -transfer),
          energy: Math.max(0, attacker.energy - DUEL_ENERGY_COST),
          health: Math.max(1, attacker.health - attackerHealthLoss),
          wantedLevel: attacker.wantedLevel + attackerHeat,
        },
      }),
      this.prisma.character.update({
        where: { id: defender.id },
        data: {
          credits: defender.credits + (attackerWins ? -transfer : transfer),
          health: Math.max(1, defender.health - defenderHealthLoss),
        },
      }),
      this.prisma.activityLog.create({
        data: {
          playerId: attacker.playerId,
          characterId: attacker.id,
          type: 'COMBAT_EVENT',
          message: attackerWins
            ? `${attacker.name} won a duel against ${defender.name} (+$${transfer})`
            : `${attacker.name} lost a duel against ${defender.name} (-$${transfer})`,
          relatedEntities: { targetId: defender.id, wager, transfer, attackerWins },
        },
      }),
      ...(defender.playerId
        ? [
            this.prisma.activityLog.create({
              data: {
                playerId: defender.playerId,
                characterId: defender.id,
                type: 'COMBAT_EVENT',
                message: attackerWins
                  ? `${defender.name} was defeated in a duel by ${attacker.name} (-$${transfer})`
                  : `${defender.name} fended off a duel from ${attacker.name} (+$${transfer})`,
                relatedEntities: { attackerId: attacker.id, wager, transfer, attackerWins },
              },
            }),
          ]
        : []),
    ]);

    return {
      duel,
      result: {
        attackerWins,
        winnerName: winner.name,
        loserName: loser.name,
        creditsTransferred: transfer,
        attacker: contest.attacker,
        defender: contest.defender,
        attackerHeat,
      },
    };
  }

  async duelHistory(characterId: string, playerId: string, limit = 15) {
    await this.getOwnedCharacter(characterId, playerId);
    return this.prisma.duel.findMany({
      where: { OR: [{ attackerId: characterId }, { defenderId: characterId }] },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, limit),
      include: {
        attacker: { select: { id: true, name: true, level: true } },
        defender: { select: { id: true, name: true, level: true } },
      },
    });
  }

  async postBounty(
    playerId: string,
    characterId: string,
    targetId: string,
    amount: number,
    reason?: string,
  ) {
    if (characterId === targetId) {
      throw new BadRequestException('You cannot put a bounty on yourself');
    }
    if (!Number.isFinite(amount) || amount < BOUNTY_MIN_AMOUNT) {
      throw new BadRequestException(`Bounties start at ${BOUNTY_MIN_AMOUNT} credits`);
    }

    const [poster, target] = await Promise.all([
      this.getOwnedCharacter(characterId, playerId),
      this.prisma.character.findUnique({ where: { id: targetId } }),
    ]);
    if (!target) throw new NotFoundException('Target not found');
    if (target.type !== 'PLAYER') {
      throw new BadRequestException('Bounties can only target players');
    }
    this.assertPvpEligible(target, 'target');
    if (poster.credits < amount) {
      throw new BadRequestException('You cannot escrow credits you do not have');
    }

    const existing = await this.prisma.playerBounty.findFirst({
      where: { targetId, postedById: characterId, status: 'OPEN' },
    });
    if (existing) {
      throw new BadRequestException('You already have an open bounty on this operator');
    }

    const [bounty] = await this.prisma.$transaction([
      this.prisma.playerBounty.create({
        data: {
          targetId,
          postedById: characterId,
          amount,
          reason: reason?.slice(0, 200) ?? null,
        },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { credits: poster.credits - amount },
      }),
      this.prisma.activityLog.create({
        data: {
          playerId: poster.playerId,
          characterId: poster.id,
          type: 'COMBAT_EVENT',
          message: `${poster.name} posted a $${amount} bounty on ${target.name}`,
          relatedEntities: { targetId, amount },
        },
      }),
    ]);

    return bounty;
  }

  async openBounties() {
    return this.prisma.playerBounty.findMany({
      where: { status: 'OPEN' },
      orderBy: { amount: 'desc' },
      take: 50,
      include: {
        target: {
          select: {
            id: true,
            name: true,
            level: true,
            currentPlanet: { select: { id: true, name: true } },
            currentDistrictId: true,
          },
        },
        postedBy: { select: { id: true, name: true } },
      },
    });
  }

  async claimBounty(playerId: string, characterId: string, bountyId: string) {
    const bounty = await this.prisma.playerBounty.findUnique({
      where: { id: bountyId },
      include: { target: true },
    });
    if (!bounty) throw new NotFoundException('Bounty not found');
    if (bounty.status !== 'OPEN') {
      throw new BadRequestException('This bounty is no longer open');
    }
    if (bounty.targetId === characterId) {
      throw new BadRequestException('You cannot claim a bounty on yourself');
    }
    if (bounty.postedById === characterId) {
      throw new BadRequestException('You posted this bounty — cancel it instead');
    }

    const hunter = await this.getOwnedCharacter(characterId, playerId);
    this.assertPvpEligible(hunter, 'hunter');

    const target = bounty.target;
    if (!hunter.currentDistrictId || hunter.currentDistrictId !== target.currentDistrictId) {
      throw new BadRequestException('You must track the target to their district first');
    }
    if (hunter.energy < BOUNTY_CLAIM_ENERGY_COST) {
      throw new BadRequestException(
        `A bounty attempt costs ${BOUNTY_CLAIM_ENERGY_COST} energy (you have ${hunter.energy})`,
      );
    }

    const [hunterStats, targetStats] = await Promise.all([
      this.getEffectiveStats(hunter),
      this.getEffectiveStats(target),
    ]);
    const contest = rollBountyClaim(hunterStats, targetStats);

    if (contest.attackerWins) {
      await this.prisma.$transaction([
        this.prisma.playerBounty.update({
          where: { id: bountyId },
          data: { status: 'CLAIMED', claimedById: hunter.id, claimedAt: new Date() },
        }),
        this.prisma.character.update({
          where: { id: hunter.id },
          data: {
            credits: hunter.credits + bounty.amount,
            energy: Math.max(0, hunter.energy - BOUNTY_CLAIM_ENERGY_COST),
          },
        }),
        this.prisma.character.update({
          where: { id: target.id },
          data: { health: Math.max(1, target.health - BOUNTY_TARGET_HEALTH_LOSS) },
        }),
        this.prisma.activityLog.create({
          data: {
            playerId: hunter.playerId,
            characterId: hunter.id,
            type: 'COMBAT_EVENT',
            message: `${hunter.name} claimed the $${bounty.amount} bounty on ${target.name}`,
            relatedEntities: { bountyId, amount: bounty.amount, targetId: target.id },
          },
        }),
        ...(target.playerId
          ? [
              this.prisma.activityLog.create({
                data: {
                  playerId: target.playerId,
                  characterId: target.id,
                  type: 'COMBAT_EVENT',
                  message: `${target.name} was taken down by ${hunter.name} — the $${bounty.amount} bounty was claimed`,
                  relatedEntities: { bountyId, hunterId: hunter.id },
                },
              }),
            ]
          : []),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.character.update({
          where: { id: hunter.id },
          data: {
            energy: Math.max(0, hunter.energy - BOUNTY_CLAIM_ENERGY_COST),
            health: Math.max(1, hunter.health - BOUNTY_FAILED_CLAIM_HEALTH_LOSS),
          },
        }),
        this.prisma.activityLog.create({
          data: {
            playerId: hunter.playerId,
            characterId: hunter.id,
            type: 'COMBAT_EVENT',
            message: `${hunter.name} failed to collect the bounty on ${target.name} and limped away`,
            relatedEntities: { bountyId, targetId: target.id },
          },
        }),
        ...(target.playerId
          ? [
              this.prisma.activityLog.create({
                data: {
                  playerId: target.playerId,
                  characterId: target.id,
                  type: 'COMBAT_EVENT',
                  message: `${target.name} shook off a bounty hunter (${hunter.name})`,
                  relatedEntities: { bountyId, hunterId: hunter.id },
                },
              }),
            ]
          : []),
      ]);
    }

    return {
      claimed: contest.attackerWins,
      amount: contest.attackerWins ? bounty.amount : 0,
      contest,
      targetName: target.name,
    };
  }

  async cancelBounty(playerId: string, characterId: string, bountyId: string) {
    const bounty = await this.prisma.playerBounty.findUnique({ where: { id: bountyId } });
    if (!bounty) throw new NotFoundException('Bounty not found');
    if (bounty.postedById !== characterId) {
      throw new ForbiddenException('Only the poster can cancel a bounty');
    }
    if (bounty.status !== 'OPEN') {
      throw new BadRequestException('This bounty is no longer open');
    }

    const poster = await this.getOwnedCharacter(characterId, playerId);

    const [updated] = await this.prisma.$transaction([
      this.prisma.playerBounty.update({
        where: { id: bountyId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { credits: poster.credits + bounty.amount },
      }),
    ]);

    return updated;
  }

  /** Public standings: level, credits, duel record, bounties claimed. */
  async leaderboard() {
    const players = await this.prisma.character.findMany({
      where: { type: 'PLAYER' },
      select: { id: true, name: true, level: true, xp: true, credits: true },
      orderBy: [{ level: 'desc' }, { xp: 'desc' }],
      take: 50,
    });

    const ids = players.map((player) => player.id);
    const [wins, duels, bounties] = await Promise.all([
      this.prisma.duel.groupBy({
        by: ['winnerId'],
        where: { winnerId: { in: ids } },
        _count: { winnerId: true },
      }),
      this.prisma.duel.findMany({
        where: { OR: [{ attackerId: { in: ids } }, { defenderId: { in: ids } }] },
        select: { attackerId: true, defenderId: true },
      }),
      this.prisma.playerBounty.groupBy({
        by: ['claimedById'],
        where: { status: 'CLAIMED', claimedById: { in: ids } },
        _count: { claimedById: true },
      }),
    ]);

    const winCounts = new Map(wins.map((row) => [row.winnerId, row._count.winnerId]));
    const duelCounts = new Map<string, number>();
    for (const duel of duels) {
      duelCounts.set(duel.attackerId, (duelCounts.get(duel.attackerId) ?? 0) + 1);
      duelCounts.set(duel.defenderId, (duelCounts.get(duel.defenderId) ?? 0) + 1);
    }
    const bountyCounts = new Map(
      bounties
        .filter((row) => row.claimedById)
        .map((row) => [row.claimedById as string, row._count.claimedById]),
    );

    return players.map((player, index) => {
      const total = duelCounts.get(player.id) ?? 0;
      const won = winCounts.get(player.id) ?? 0;
      return {
        rank: index + 1,
        characterId: player.id,
        name: player.name,
        level: player.level ?? 1,
        credits: Math.round(player.credits),
        duelsWon: won,
        duelsLost: total - won,
        bountiesClaimed: bountyCounts.get(player.id) ?? 0,
      };
    });
  }
}
