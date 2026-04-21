import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';

@Injectable()
export class SimulationService {
  constructor(
    private prisma: PrismaService,
    private opportunitiesService: OpportunitiesService,
  ) {}

  async tick() {
    const now = new Date();
    const results: Array<
      | { instanceId: string; status: string; outcome: unknown }
      | { instanceId: string; error: string }
    > = [];

    // Find all due opportunity instances
    const dueInstances = await this.prisma.opportunityInstance.findMany({
      where: {
        status: 'IN_PROGRESS',
        completesAt: { lte: now },
      },
      include: { definition: true, character: true },
    });

    for (const instance of dueInstances) {
      try {
        const result = await this.opportunitiesService.resolveInstanceInternal(instance);
        results.push({ instanceId: instance.id, status: result.status, outcome: result.outcome });
      } catch (err) {
        results.push({ instanceId: instance.id, error: (err as Error).message });
      }
    }

    // Activate scheduled world events
    const scheduledEvents = await this.prisma.worldEvent.findMany({
      where: {
        status: 'SCHEDULED',
        startsAt: { lte: now },
      },
    });
    for (const event of scheduledEvents) {
      await this.prisma.worldEvent.update({
        where: { id: event.id },
        data: { status: 'ACTIVE' },
      });
    }

    // Resolve ended world events
    const activeEvents = await this.prisma.worldEvent.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lte: now },
      },
    });
    for (const event of activeEvents) {
      await this.prisma.worldEvent.update({
        where: { id: event.id },
        data: { status: 'RESOLVED' },
      });
    }

    return {
      processedAt: now.toISOString(),
      opportunitiesResolved: results.length,
      worldEventsActivated: scheduledEvents.length,
      worldEventsResolved: activeEvents.length,
      results,
    };
  }

  async getWorldState() {
    const [planets, factions, corporations, activeEvents] = await Promise.all([
      this.prisma.planet.findMany({ include: { solarSystem: true } }),
      this.prisma.faction.findMany(),
      this.prisma.corporation.findMany(),
      this.prisma.worldEvent.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      planets,
      factions,
      corporations,
      activeWorldEvents: activeEvents,
    };
  }
}
