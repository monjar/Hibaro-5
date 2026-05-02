import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  evaluateJobShift,
  shouldEvaluateForStrike,
  STRIKES_BEFORE_FIRED,
} from '@heliora/game-rules';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async listForCharacter(characterId: string, playerId: string) {
    await this.assertCharacterOwnership(characterId, playerId);
    return this.prisma.jobEmployment.findMany({
      where: { characterId },
      include: { opportunity: true },
      orderBy: { hiredAt: 'desc' },
    });
  }

  async hire(opportunityId: string, characterId: string, playerId: string) {
    await this.assertCharacterOwnership(characterId, playerId);

    const opportunity = await this.prisma.opportunityDefinition.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    if (opportunity.kind !== 'JOB') {
      throw new BadRequestException('Only JOB-kind opportunities can be hired for');
    }

    const existing = await this.prisma.jobEmployment.findUnique({
      where: { characterId_opportunityId: { characterId, opportunityId } },
    });
    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new BadRequestException('Already employed at this job');
      }
      await this.assertNoOtherActiveEmployment(characterId, opportunityId);
      const reactivated = await this.prisma.jobEmployment.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          strikes: 0,
          hiredAt: new Date(),
          lastShiftAt: new Date(),
        },
        include: { opportunity: true },
      });
      await this.logActivity(characterId, playerId, 'JOB_HIRED', `Re-hired: ${opportunity.title}`);
      return reactivated;
    }

    await this.assertNoOtherActiveEmployment(characterId);

    const employment = await this.prisma.jobEmployment.create({
      data: {
        characterId,
        opportunityId,
        cadenceHours: this.extractCadenceHours(opportunity),
      },
      include: { opportunity: true },
    });

    await this.logActivity(characterId, playerId, 'JOB_HIRED', `Hired: ${opportunity.title}`);
    return employment;
  }

  async quit(employmentId: string, playerId: string) {
    const employment = await this.prisma.jobEmployment.findUnique({
      where: { id: employmentId },
      include: { opportunity: true, character: true },
    });
    if (!employment) throw new NotFoundException('Employment not found');
    if (employment.character.playerId !== playerId) {
      throw new ForbiddenException('You can only quit your own jobs');
    }
    if (employment.status !== 'ACTIVE') {
      throw new BadRequestException(`Already ${employment.status.toLowerCase()}`);
    }
    const updated = await this.prisma.jobEmployment.update({
      where: { id: employmentId },
      data: { status: 'QUIT' },
      include: { opportunity: true },
    });
    await this.logActivity(
      employment.characterId,
      playerId,
      'JOB_QUIT',
      `Quit: ${employment.opportunity.title}`,
    );
    return updated;
  }

  async findActiveEmployment(characterId: string, opportunityId: string) {
    return this.prisma.jobEmployment.findUnique({
      where: { characterId_opportunityId: { characterId, opportunityId } },
    });
  }

  async markShiftCompleted(employmentId: string, creditsEarned: number) {
    return this.prisma.jobEmployment.update({
      where: { id: employmentId },
      data: {
        lastShiftAt: new Date(),
        totalShiftsCompleted: { increment: 1 },
        totalCreditsEarned: { increment: creditsEarned },
        strikes: 0,
      },
    });
  }

  /** Called by simulation tick. Returns summary for logging. */
  async processStrikes(now = new Date()) {
    const active = await this.prisma.jobEmployment.findMany({
      where: { status: 'ACTIVE' },
      include: { opportunity: true, character: true },
    });

    let evaluated = 0;
    let struck = 0;
    let fired = 0;

    for (const employment of active) {
      if (!shouldEvaluateForStrike(now, employment.lastShiftAt, employment.cadenceHours)) {
        continue;
      }
      evaluated += 1;
      const salary = this.extractShiftSalary(employment.opportunity);
      const result = evaluateJobShift({
        now,
        lastShiftAt: employment.lastShiftAt,
        cadenceHours: employment.cadenceHours,
        strikes: employment.strikes,
        shiftSalary: salary,
      });

      if (!result.shouldStrike) continue;
      struck += 1;

      // Reset the strike timer so we don't penalize again next tick.
      // The cadence resumes from now; another miss within cadence triggers next strike.
      const newLastShiftAt = new Date(now);

      await this.prisma.jobEmployment.update({
        where: { id: employment.id },
        data: {
          strikes: result.newStrikes,
          status: result.newStatus,
          lastShiftAt: newLastShiftAt,
        },
      });

      if (employment.character.playerId) {
        if (result.penaltyCredits > 0) {
          await this.prisma.character.update({
            where: { id: employment.characterId },
            data: { credits: { decrement: result.penaltyCredits } },
          });
        }

        if (result.newStatus === 'FIRED') {
          fired += 1;
          await this.logActivity(
            employment.characterId,
            employment.character.playerId,
            'JOB_FIRED',
            `Fired from ${employment.opportunity.title} after ${STRIKES_BEFORE_FIRED} missed shifts`,
            { strikes: result.newStrikes, penaltyCredits: result.penaltyCredits },
          );
        } else {
          await this.logActivity(
            employment.characterId,
            employment.character.playerId,
            'JOB_STRIKE',
            `Strike ${result.newStrikes}/${STRIKES_BEFORE_FIRED} at ${employment.opportunity.title} (–$${result.penaltyCredits})`,
            { strikes: result.newStrikes, penaltyCredits: result.penaltyCredits },
          );
        }
      }
    }

    return { evaluated, struck, fired, total: active.length };
  }

  private extractCadenceHours(opp: { repeatability?: unknown }): number {
    const r = opp.repeatability as { cadenceHours?: number } | null | undefined;
    if (r && typeof r.cadenceHours === 'number' && r.cadenceHours > 0) {
      return Math.round(r.cadenceHours);
    }
    return 24;
  }

  private extractShiftSalary(opp: { rewards: unknown }): number {
    const rewards = (opp.rewards as Array<{ type?: string; value?: number }>) ?? [];
    const credits = rewards.find((r) => r.type === 'CREDITS');
    return typeof credits?.value === 'number' ? credits.value : 0;
  }

  private async assertCharacterOwnership(characterId: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only manage jobs for your own character');
    }
  }

  private async assertNoOtherActiveEmployment(characterId: string, ignoredOpportunityId?: string) {
    const activeEmployment = await this.prisma.jobEmployment.findFirst({
      where: {
        characterId,
        status: 'ACTIVE',
        ...(ignoredOpportunityId ? { opportunityId: { not: ignoredOpportunityId } } : {}),
      },
      include: { opportunity: { select: { title: true } } },
    });

    if (activeEmployment) {
      throw new BadRequestException(
        `Only one active job is allowed. Quit ${activeEmployment.opportunity.title} before taking another job.`,
      );
    }
  }

  private async logActivity(
    characterId: string,
    playerId: string,
    type:
      | 'JOB_HIRED'
      | 'JOB_FIRED'
      | 'JOB_QUIT'
      | 'JOB_STRIKE'
      | 'JOB_FAILED',
    message: string,
    relatedEntities?: Record<string, unknown>,
  ) {
    await this.prisma.activityLog.create({
      data: {
        characterId,
        playerId,
        type,
        message,
        relatedEntities: (relatedEntities ?? {}) as Prisma.InputJsonObject,
      },
    });
  }
}
