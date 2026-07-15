import { Injectable } from '@nestjs/common';
import { Prisma, RelationshipType } from '@prisma/client';
import { REALTIME_EVENT_CONTRACTS } from '@heliora/platform-sdk';
import {
  FACTION_WAR_CONTEST_CHANCE,
  computeNextStockPrice,
  evaluateRentCycle,
  factionPresenceScore,
  resolveDistrictContest,
} from '@heliora/game-rules';
import { PrismaService } from '../../prisma/prisma.service';
import { OpportunitiesService, REST_OPPORTUNITY_ID } from '../opportunities/opportunities.service';
import { JobsService } from '../jobs/jobs.service';
import { RealtimeService } from '../realtime/realtime.service';
import { clampWorldMetric, deriveCorporationStatus } from './simulation.utils';

const ENERGY_DECAY_PER_HOUR = 3;
const ENERGY_DECAY_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class SimulationService {
  constructor(
    private prisma: PrismaService,
    private opportunitiesService: OpportunitiesService,
    private jobsService: JobsService,
    private realtimeService: RealtimeService,
  ) {}

  async tick() {
    const now = new Date();

    const opportunityResults = await this.resolveDueOpportunities(now);
    const worldEvents = await this.syncWorldEvents(now);
    const economy = await this.advanceEconomy();
    const corporations = await this.advanceCorporations();
    const factionWars = await this.advanceFactionWars();
    const districtControl = await this.buildDistrictControlState();
    const energyDecay = await this.applyEnergyDecay(now);
    const housingRent = await this.collectHousingRent(now);
    const npcActivity = await this.processNpcActivity(now);
    const jobShifts = await this.jobsService.processStrikes(now);

    const stepSummaries = [
      {
        step: 'opportunity_resolution' as const,
        processed: opportunityResults.length,
        changes: opportunityResults.length,
        notes: opportunityResults.length
          ? ['Resolved due opportunity instances']
          : ['No due opportunities'],
      },
      {
        step: 'world_events' as const,
        processed: worldEvents.activated + worldEvents.resolved,
        changes: worldEvents.activated + worldEvents.resolved,
        notes: [`${worldEvents.activated} activated`, `${worldEvents.resolved} resolved`],
      },
      {
        step: 'economy' as const,
        processed: economy.processed,
        changes: economy.updated,
        notes: economy.notes,
      },
      {
        step: 'corporations' as const,
        processed: corporations.processed,
        changes: corporations.updated,
        notes: corporations.notes,
      },
      {
        step: 'faction_wars' as const,
        processed: factionWars.contested,
        changes: factionWars.flips.length,
        notes: factionWars.flips.length
          ? factionWars.flips.map((flip) => flip.summary)
          : [`${factionWars.contested} district(s) contested, no control changes`],
      },
      {
        step: 'district_control' as const,
        processed: districtControl.length,
        changes: districtControl.filter((district) => district.controlScore !== 50).length,
        notes: ['Computed district travel surcharges and control scores'],
      },
      {
        step: 'energy_decay' as const,
        processed: energyDecay.processed,
        changes: energyDecay.changed,
        notes: [
          `${energyDecay.changed} character(s) decayed`,
          `${energyDecay.totalEnergyLost} total energy lost`,
        ],
      },
      {
        step: 'housing_rent' as const,
        processed: housingRent.processed,
        changes: housingRent.paid + housingRent.evicted,
        notes: [
          `${housingRent.paid} rent payment(s) collected (${housingRent.totalCollected} credits)`,
          `${housingRent.evicted} eviction(s)`,
        ],
      },
      {
        step: 'npc_activity' as const,
        processed: npcActivity.actions.length,
        changes: npcActivity.actions.length,
        notes: npcActivity.actions.length
          ? ['Logged notable NPC actions']
          : ['No NPC actors available'],
      },
      {
        step: 'job_shifts' as const,
        processed: jobShifts.evaluated,
        changes: jobShifts.struck,
        notes: [
          `${jobShifts.struck} strike(s) issued`,
          `${jobShifts.fired} fired`,
          `${jobShifts.total} total active`,
        ],
      },
    ];

    const results: Record<string, unknown>[] = [
      ...opportunityResults,
      { type: 'world-events', activated: worldEvents.activated, resolved: worldEvents.resolved },
      { type: 'economy', updates: economy.updated },
      { type: 'corporations', updates: corporations.updated },
      { type: 'energy-decay', changed: energyDecay.changed, totalEnergyLost: energyDecay.totalEnergyLost },
      ...npcActivity.actions,
    ];

    const summary = {
      processedAt: now.toISOString(),
      totals: {
        opportunitiesResolved: opportunityResults.length,
        worldEventsActivated: worldEvents.activated,
        worldEventsResolved: worldEvents.resolved,
        marketUpdates: economy.updated,
        corporationUpdates: corporations.updated,
        districtControlUpdates: districtControl.length,
        energyDecayUpdates: energyDecay.changed,
        npcActions: npcActivity.actions.length,
      },
      stepSummaries,
    };

    const storedTick = await this.prisma.simulationTick.create({
      data: {
        processedAt: now,
        summary: summary as Prisma.JsonObject,
        results: results as Prisma.JsonArray,
      },
    });

    const tickSummary = {
      id: storedTick.id,
      ...summary,
      results,
    };

    this.realtimeService.publish('simulation.tick.completed', tickSummary);
    for (const action of npcActivity.actions) {
      this.realtimeService.publish('npc.activity.recorded', action);
    }
    for (const flip of factionWars.flips) {
      // Surfaces in the dashboard World Feed alongside NPC activity.
      this.realtimeService.publish('npc.activity.recorded', {
        action: 'FACTION_CONTROL_FLIP',
        summary: flip.summary,
        districtId: flip.districtId,
        factionId: flip.factionId,
        createdAt: now.toISOString(),
      });
    }

    return tickSummary;
  }

  private async advanceFactionWars() {
    const [factions, factionBuildings, districts] = await Promise.all([
      this.prisma.faction.findMany({ select: { id: true, name: true, influence: true } }),
      this.prisma.building.findMany({
        where: { ownerType: 'FACTION', ownerId: { not: null } },
        select: { ownerId: true, districtId: true, district: { select: { planetId: true } } },
      }),
      this.prisma.district.findMany({
        select: { id: true, name: true, planetId: true, controllingFactionId: true },
      }),
    ]);

    const totalInfluence = factions.reduce(
      (sum, faction) => sum + Math.max(0, faction.influence),
      0,
    );
    const factionNames = new Map(factions.map((faction) => [faction.id, faction.name]));
    const flips: Array<{ districtId: string; factionId: string | null; summary: string }> = [];
    let contested = 0;

    for (const district of districts) {
      if (Math.random() >= FACTION_WAR_CONTEST_CHANCE) continue;
      contested += 1;

      const presences = factions
        .filter((faction) => faction.influence > 0)
        .map((faction) => ({
          factionId: faction.id,
          score: factionPresenceScore({
            factionId: faction.id,
            influenceShare:
              totalInfluence > 0 ? Math.max(0, faction.influence) / totalInfluence : 0,
            buildingsInDistrict: factionBuildings.filter(
              (building) =>
                building.ownerId === faction.id && building.districtId === district.id,
            ).length,
            buildingsOnPlanet: factionBuildings.filter(
              (building) =>
                building.ownerId === faction.id &&
                building.district.planetId === district.planetId,
            ).length,
            jitter: Math.random(),
          }),
        }));

      const result = resolveDistrictContest(district.controllingFactionId, presences);
      if (!result.flipped || result.controllingFactionId === district.controllingFactionId) {
        continue;
      }

      await this.prisma.district.update({
        where: { id: district.id },
        data: { controllingFactionId: result.controllingFactionId },
      });

      const newFactionName = result.controllingFactionId
        ? factionNames.get(result.controllingFactionId) ?? 'An unknown faction'
        : null;
      const previousName = district.controllingFactionId
        ? factionNames.get(district.controllingFactionId) ?? 'the previous holders'
        : null;
      const summary = previousName
        ? `⚑ ${newFactionName} wrested control of ${district.name} from ${previousName}`
        : `⚑ ${newFactionName} claimed control of ${district.name}`;

      await this.prisma.activityLog.create({
        data: {
          type: 'WORLD_EVENT_TRIGGERED',
          message: summary,
          relatedEntities: {
            districtId: district.id,
            factionId: result.controllingFactionId,
            previousFactionId: district.controllingFactionId,
            challengerScore: result.challengerScore,
            incumbentScore: result.incumbentScore,
          },
        },
      });

      flips.push({ districtId: district.id, factionId: result.controllingFactionId, summary });
    }

    return { contested, flips };
  }

  async getHistory(limit = 10) {
    const ticks = await this.prisma.simulationTick.findMany({
      orderBy: { processedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return ticks.map((tick) => ({
      id: tick.id,
      ...(tick.summary as Record<string, unknown>),
      results: (tick.results as Record<string, unknown>[] | null) ?? [],
    }));
  }

  getRealtimeContracts() {
    return REALTIME_EVENT_CONTRACTS;
  }

  async getWorldState() {
    const [planets, factions, corporations, activeEvents, districts, npcLogs, recentTicks] =
      await Promise.all([
        this.prisma.planet.findMany({
          include: { solarSystem: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.faction.findMany({ orderBy: { influence: 'desc' } }),
        this.prisma.corporation.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.worldEvent.findMany({
          where: {
            status: 'ACTIVE',
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
          orderBy: { startsAt: 'desc' },
        }),
        this.prisma.district.findMany({
          include: { planet: true, controllingFaction: true },
          orderBy: [{ planet: { name: 'asc' } }, { name: 'asc' }],
        }),
        this.prisma.activityLog.findMany({
          where: { playerId: null, characterId: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: { character: true },
        }),
        this.prisma.simulationTick.findMany({ orderBy: { processedAt: 'desc' }, take: 8 }),
      ]);

    const districtControl = districts.map((district) => ({
      districtId: district.id,
      districtName: district.name,
      planetId: district.planetId,
      planetName: district.planet.name,
      controllingFactionId: district.controllingFactionId,
      controllingFactionName: district.controllingFaction?.name ?? null,
      controlScore: clampWorldMetric(
        50 +
          Math.round((district.controllingFaction?.influence ?? 0) / 12) +
          district.lawLevel * 2 -
          district.dangerLevel * 3,
        5,
        95,
      ),
      travelSurcharge: Math.max(0, district.dangerLevel * 2 + Math.max(0, 4 - district.lawLevel)),
      dangerLevel: district.dangerLevel,
      lawLevel: district.lawLevel,
      economyLevel: district.economyLevel,
    }));

    return {
      timestamp: new Date().toISOString(),
      planets,
      factions,
      corporations,
      activeWorldEvents: activeEvents,
      marketState: {
        planetaryMarkets: planets.map((planet) => ({
          planetId: planet.id,
          planetName: planet.name,
          economyLevel: planet.economyLevel,
          demandIndex: clampWorldMetric(
            planet.economyLevel + planet.lawLevel - planet.dangerLevel,
            1,
            15,
          ),
          riskIndex: clampWorldMetric(planet.dangerLevel + Math.max(0, 5 - planet.lawLevel), 1, 15),
          travelPressure: clampWorldMetric(
            planet.dangerLevel * 2 + Math.max(0, 5 - planet.lawLevel),
            1,
            20,
          ),
        })),
        corporations: corporations.map((corporation) => ({
          corporationId: corporation.id,
          corporationName: corporation.name,
          industry: corporation.industry,
          status: corporation.status,
          stockTicker: corporation.stockTicker,
          stockPrice: corporation.stockPrice,
          stockVolatility: corporation.stockVolatility,
          revenue: corporation.revenue,
          debt: corporation.debt,
          cash: corporation.cash,
          riskOfBankruptcy: corporation.riskOfBankruptcy,
          marketMomentum: Number((corporation.revenue - corporation.debt * 0.2).toFixed(2)),
        })),
        totalCorporateCash: corporations.reduce((sum, corporation) => sum + corporation.cash, 0),
        totalCorporateDebt: corporations.reduce((sum, corporation) => sum + corporation.debt, 0),
      },
      districtControl,
      recentNpcActivity: npcLogs.map((log) => {
        const related = (log.relatedEntities as Record<string, unknown> | null) ?? {};
        return {
          characterId: log.characterId ?? 'unknown',
          characterName: log.character?.name ?? 'Unknown NPC',
          action: log.type,
          targetType: typeof related.targetType === 'string' ? related.targetType : undefined,
          targetId: typeof related.targetId === 'string' ? related.targetId : undefined,
          targetName: typeof related.targetName === 'string' ? related.targetName : undefined,
          creditsDelta: typeof related.creditsDelta === 'number' ? related.creditsDelta : 0,
          influenceDelta: typeof related.influenceDelta === 'number' ? related.influenceDelta : 0,
          summary: log.message,
          createdAt: log.createdAt.toISOString(),
        };
      }),
      recentTicks: recentTicks.map((tick) => ({
        id: tick.id,
        ...(tick.summary as Record<string, unknown>),
        results: (tick.results as Record<string, unknown>[] | null) ?? [],
      })),
      realtimeContracts: REALTIME_EVENT_CONTRACTS,
    };
  }

  private async resolveDueOpportunities(now: Date) {
    const dueInstances = await this.prisma.opportunityInstance.findMany({
      where: {
        status: 'IN_PROGRESS',
        completesAt: { lte: now },
      },
      include: { definition: true, character: true },
    });

    const results: Record<string, unknown>[] = [];
    for (const instance of dueInstances) {
      try {
        const result = await this.opportunitiesService.resolveInstanceInternal(instance);
        results.push({
          type: 'opportunity',
          instanceId: instance.id,
          status: result.status,
          outcome: result.outcome,
        });
      } catch (error) {
        results.push({
          type: 'opportunity',
          instanceId: instance.id,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  private async syncWorldEvents(now: Date) {
    const [scheduledEvents, expiringEvents] = await Promise.all([
      this.prisma.worldEvent.findMany({
        where: {
          status: 'SCHEDULED',
          startsAt: { lte: now },
        },
      }),
      this.prisma.worldEvent.findMany({
        where: {
          status: 'ACTIVE',
          endsAt: { lte: now },
        },
      }),
    ]);

    await Promise.all([
      ...scheduledEvents.map((event) =>
        this.prisma.worldEvent.update({ where: { id: event.id }, data: { status: 'ACTIVE' } }),
      ),
      ...expiringEvents.map((event) =>
        this.prisma.worldEvent.update({ where: { id: event.id }, data: { status: 'RESOLVED' } }),
      ),
    ]);

    return { activated: scheduledEvents.length, resolved: expiringEvents.length };
  }

  private async advanceEconomy() {
    const planets = await this.prisma.planet.findMany({ include: { districts: true } });
    const activeEvents = await this.prisma.worldEvent.findMany({ where: { status: 'ACTIVE' } });

    let updated = 0;
    for (const planet of planets) {
      const avgDistrictEconomy = planet.districts.length
        ? planet.districts.reduce((sum, district) => sum + district.economyLevel, 0) /
          planet.districts.length
        : planet.economyLevel;
      const eventPressure = activeEvents.filter(
        (event) =>
          event.scope === 'WORLD' ||
          event.scope === 'PLANET' ||
          JSON.stringify(event.affectedEntities).includes(planet.id),
      ).length;
      const nextEconomyLevel = clampWorldMetric(
        Math.round(
          (planet.economyLevel +
            avgDistrictEconomy +
            planet.lawLevel -
            planet.dangerLevel -
            eventPressure) /
            2,
        ),
        1,
        10,
      );

      if (nextEconomyLevel !== planet.economyLevel) {
        updated += 1;
        await this.prisma.planet.update({
          where: { id: planet.id },
          data: { economyLevel: nextEconomyLevel },
        });
      }
    }

    return {
      processed: planets.length,
      updated,
      notes: ['Updated planetary economy indexes from districts and active events'],
    };
  }

  private async advanceCorporations() {
    const [corporations, planets, employments, activeEvents] = await Promise.all([
      this.prisma.corporation.findMany(),
      this.prisma.planet.findMany(),
      this.prisma.corporationEmployment.findMany(),
      this.prisma.worldEvent.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    const employmentMap = new Map<string, number>();
    for (const employment of employments) {
      employmentMap.set(
        employment.corporationId,
        (employmentMap.get(employment.corporationId) ?? 0) + 1,
      );
    }

    const planetEconomyIndex = planets.length
      ? planets.reduce((sum, planet) => sum + planet.economyLevel, 0) / planets.length
      : 5;

    let updated = 0;
    for (const corporation of corporations) {
      const activeEventPressure = activeEvents.filter(
        (event) =>
          event.scope === 'WORLD' ||
          event.scope === 'CORPORATION' ||
          JSON.stringify(event.affectedEntities).includes(corporation.id),
      ).length;
      const employmentCount = employmentMap.get(corporation.id) ?? 0;
      const revenue = Number(
        Math.max(
          25,
          corporation.revenue * 0.6 +
            planetEconomyIndex * 22 +
            employmentCount * 12 -
            activeEventPressure * 15,
        ).toFixed(2),
      );
      const debt = Number(
        Math.max(
          0,
          corporation.debt * 0.88 + activeEventPressure * 28 - employmentCount * 6,
        ).toFixed(2),
      );
      const cash = Number(Math.max(0, corporation.cash + revenue - debt * 0.12).toFixed(2));
      const riskOfBankruptcy = Number(
        clampWorldMetric(
          debt / Math.max(1, cash + revenue) + activeEventPressure * 0.08,
          0,
          1,
        ).toFixed(2),
      );
      const stockVolatility = Number(
        clampWorldMetric(
          0.12 + activeEventPressure * 0.08 + riskOfBankruptcy * 0.2,
          0.05,
          1,
        ).toFixed(2),
      );

      const drift =
        planetEconomyIndex * 0.4 -
        activeEventPressure * 1.5 +
        employmentCount * 0.4 -
        riskOfBankruptcy * 5;

      const move = computeNextStockPrice({
        currentPrice: corporation.stockPrice ?? 40,
        volatility: stockVolatility,
        drift,
      });
      const stockPrice = move.nextPrice;

      const status = deriveCorporationStatus(riskOfBankruptcy, cash, debt);

      updated += 1;
      await this.prisma.corporation.update({
        where: { id: corporation.id },
        data: {
          revenue,
          debt,
          cash,
          riskOfBankruptcy,
          stockPrice,
          stockVolatility,
          status,
        },
      });
      await this.prisma.stockPriceHistory.create({
        data: { corporationId: corporation.id, price: stockPrice },
      });
    }

    // Trim history to 200 most recent rows per corporation to avoid unbounded growth.
    await this.trimStockPriceHistory(200);

    return {
      processed: corporations.length,
      updated,
      notes: ['Applied price movement rules and bankruptcy pressure'],
    };
  }

  private async trimStockPriceHistory(keepPerCorporation: number) {
    const corporations = await this.prisma.corporation.findMany({ select: { id: true } });
    for (const { id } of corporations) {
      const all = await this.prisma.stockPriceHistory.findMany({
        where: { corporationId: id },
        orderBy: { recordedAt: 'desc' },
        select: { id: true },
      });
      const stale = all.slice(keepPerCorporation).map((row) => row.id);
      if (stale.length > 0) {
        await this.prisma.stockPriceHistory.deleteMany({ where: { id: { in: stale } } });
      }
    }
  }

  private async buildDistrictControlState() {
    const districts = await this.prisma.district.findMany({
      include: { planet: true, controllingFaction: true },
    });

    return districts.map((district) => ({
      districtId: district.id,
      districtName: district.name,
      planetId: district.planetId,
      planetName: district.planet.name,
      controllingFactionId: district.controllingFactionId,
      controllingFactionName: district.controllingFaction?.name ?? null,
      controlScore: clampWorldMetric(
        50 +
          Math.round((district.controllingFaction?.influence ?? 0) / 12) +
          district.lawLevel * 2 -
          district.dangerLevel * 3,
        5,
        95,
      ),
      travelSurcharge: Math.max(0, district.dangerLevel * 2 + Math.max(0, 4 - district.lawLevel)),
      dangerLevel: district.dangerLevel,
      lawLevel: district.lawLevel,
      economyLevel: district.economyLevel,
    }));
  }

  private async applyEnergyDecay(now: Date) {
    const threshold = new Date(now.getTime() - ENERGY_DECAY_INTERVAL_MS);
    const restingInstances = await this.prisma.opportunityInstance.findMany({
      where: {
        definitionId: REST_OPPORTUNITY_ID,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
      },
      select: { characterId: true },
    });
    const housedCharacters = await this.prisma.characterHousing.findMany({
      where: { status: 'ACTIVE' },
      select: { characterId: true },
    });
    const exemptCharacterIds = [
      ...new Set([
        ...restingInstances.map((instance) => instance.characterId),
        // A rented safehouse keeps you rested — no passive energy decay.
        ...housedCharacters.map((housing) => housing.characterId),
      ]),
    ];
    const characters = await this.prisma.character.findMany({
      where: {
        type: 'PLAYER',
        energy: { gt: 0 },
        lastEnergyDecayAt: { lte: threshold },
        ...(exemptCharacterIds.length > 0 ? { id: { notIn: exemptCharacterIds } } : {}),
      },
      select: { id: true, energy: true, maxEnergy: true, lastEnergyDecayAt: true },
    });

    let changed = 0;
    let totalEnergyLost = 0;

    for (const character of characters) {
      const elapsedMs = now.getTime() - character.lastEnergyDecayAt.getTime();
      const elapsedHours = Math.floor(elapsedMs / ENERGY_DECAY_INTERVAL_MS);
      if (elapsedHours <= 0) {
        continue;
      }

      const energyLoss = Math.min(character.energy, elapsedHours * ENERGY_DECAY_PER_HOUR);
      const nextDecayAt = new Date(
        character.lastEnergyDecayAt.getTime() + elapsedHours * ENERGY_DECAY_INTERVAL_MS,
      );

      await this.prisma.character.update({
        where: { id: character.id },
        data: {
          energy: Math.max(0, character.energy - energyLoss),
          lastEnergyDecayAt: nextDecayAt,
        },
      });

      changed += 1;
      totalEnergyLost += energyLoss;
    }

    // Keep the decay clock current for housed characters so ending a lease
    // doesn't retroactively charge the whole housed period.
    if (housedCharacters.length > 0) {
      await this.prisma.character.updateMany({
        where: {
          id: { in: housedCharacters.map((housing) => housing.characterId) },
          lastEnergyDecayAt: { lte: threshold },
        },
        data: { lastEnergyDecayAt: now },
      });
    }

    return { processed: characters.length, changed, totalEnergyLost };
  }

  private async collectHousingRent(now: Date) {
    const dueHousings = await this.prisma.characterHousing.findMany({
      where: { status: 'ACTIVE', nextRentDueAt: { lte: now } },
      include: {
        character: { select: { id: true, name: true, playerId: true, credits: true, wantedLevel: true } },
        building: { select: { id: true, name: true } },
      },
    });

    let paid = 0;
    let evicted = 0;
    let totalCollected = 0;

    for (const housing of dueHousings) {
      const cycle = evaluateRentCycle(
        { nextRentDueAt: housing.nextRentDueAt, rentPerDay: housing.rentPerDay },
        { credits: housing.character.credits, wantedLevel: housing.character.wantedLevel },
        now,
      );

      const characterUpdates: Record<string, unknown> = {};
      if (cycle.periodsPaid > 0) {
        characterUpdates.credits = cycle.creditsAfter;
        if (cycle.wantedReduction > 0) {
          characterUpdates.wantedLevel = Math.max(
            0,
            housing.character.wantedLevel - cycle.wantedReduction,
          );
        }
      }

      if (cycle.evicted) {
        await this.prisma.$transaction([
          ...(Object.keys(characterUpdates).length > 0
            ? [
                this.prisma.character.update({
                  where: { id: housing.character.id },
                  data: characterUpdates as never,
                }),
              ]
            : []),
          // Landlord keeps nothing of yours: stored items go back to the tenant.
          this.prisma.itemInstance.updateMany({
            where: { ownerType: 'HOUSING', ownerId: housing.id },
            data: { ownerType: 'CHARACTER', ownerId: housing.character.id },
          }),
          this.prisma.characterHousing.update({
            where: { id: housing.id },
            data: {
              status: 'EVICTED',
              endedAt: now,
              nextRentDueAt: cycle.nextRentDueAt,
              totalRentPaid: housing.totalRentPaid + cycle.totalRent,
            },
          }),
          ...(housing.character.playerId
            ? [
                this.prisma.activityLog.create({
                  data: {
                    playerId: housing.character.playerId,
                    characterId: housing.character.id,
                    type: 'HOUSING_ENDED',
                    message: `${housing.character.name} was evicted from ${housing.building.name} — rent unpaid`,
                    relatedEntities: { housingId: housing.id, buildingId: housing.building.id },
                  },
                }),
              ]
            : []),
        ]);
        evicted += 1;
      } else if (cycle.periodsPaid > 0) {
        await this.prisma.$transaction([
          this.prisma.character.update({
            where: { id: housing.character.id },
            data: characterUpdates as never,
          }),
          this.prisma.characterHousing.update({
            where: { id: housing.id },
            data: {
              nextRentDueAt: cycle.nextRentDueAt,
              totalRentPaid: housing.totalRentPaid + cycle.totalRent,
            },
          }),
          ...(housing.character.playerId
            ? [
                this.prisma.activityLog.create({
                  data: {
                    playerId: housing.character.playerId,
                    characterId: housing.character.id,
                    type: 'RENT_PAID',
                    message: `${housing.character.name} paid ${cycle.totalRent} rent for ${housing.building.name}${cycle.wantedReduction > 0 ? ' and laid low (wanted -' + cycle.wantedReduction + ')' : ''}`,
                    relatedEntities: { housingId: housing.id, rent: cycle.totalRent },
                  },
                }),
              ]
            : []),
        ]);
        paid += 1;
        totalCollected += cycle.totalRent;
      }
    }

    return { processed: dueHousings.length, paid, evicted, totalCollected };
  }

  private async processNpcActivity(now: Date) {
    const npcs = await this.prisma.character.findMany({
      where: { type: 'NPC' },
      include: {
        factionMemberships: { include: { faction: true } },
        corporationEmployments: { include: { corporation: true } },
      },
      orderBy: { name: 'asc' },
      take: 6,
    });

    const actions: Record<string, unknown>[] = [];

    for (const npc of npcs) {
      const corporationEmployment = npc.corporationEmployments[0];
      const factionMembership = npc.factionMemberships[0];

      if (corporationEmployment) {
        const creditsDelta = clampWorldMetric(
          Math.round((npc.engineering + npc.intelligence + npc.hacking) / 3),
          2,
          12,
        );
        await this.prisma.corporation.update({
          where: { id: corporationEmployment.corporationId },
          data: {
            cash: { increment: creditsDelta },
            revenue: { increment: creditsDelta * 1.5 },
          },
        });
        await this.upsertRelationship(
          npc.id,
          'CORPORATION',
          corporationEmployment.corporationId,
          RelationshipType.LOYALTY,
          1,
        );
        const summary = `${npc.name} reinforced ${corporationEmployment.corporation.name} logistics and generated ${creditsDelta} credits.`;
        await this.prisma.activityLog.create({
          data: {
            characterId: npc.id,
            type: 'JOB_COMPLETED',
            message: summary,
            relatedEntities: {
              targetType: 'CORPORATION',
              targetId: corporationEmployment.corporationId,
              targetName: corporationEmployment.corporation.name,
              creditsDelta,
              influenceDelta: 0,
            },
          },
        });
        actions.push({
          characterId: npc.id,
          characterName: npc.name,
          action: 'JOB_COMPLETED',
          targetType: 'CORPORATION',
          targetId: corporationEmployment.corporationId,
          targetName: corporationEmployment.corporation.name,
          creditsDelta,
          influenceDelta: 0,
          summary,
          createdAt: now.toISOString(),
        });
        continue;
      }

      if (factionMembership) {
        const influenceDelta = clampWorldMetric(Math.round((npc.charisma + npc.stealth) / 4), 1, 5);
        await this.prisma.faction.update({
          where: { id: factionMembership.factionId },
          data: {
            influence: { increment: influenceDelta },
            treasury: { increment: influenceDelta * 4 },
          },
        });
        await this.upsertRelationship(
          npc.id,
          'FACTION',
          factionMembership.factionId,
          RelationshipType.INFLUENCE,
          influenceDelta,
        );
        const summary = `${npc.name} strengthened ${factionMembership.faction.name} presence by ${influenceDelta} influence.`;
        await this.prisma.activityLog.create({
          data: {
            characterId: npc.id,
            type: 'RELATIONSHIP_CHANGED',
            message: summary,
            relatedEntities: {
              targetType: 'FACTION',
              targetId: factionMembership.factionId,
              targetName: factionMembership.faction.name,
              creditsDelta: influenceDelta * 4,
              influenceDelta,
            },
          },
        });
        actions.push({
          characterId: npc.id,
          characterName: npc.name,
          action: 'RELATIONSHIP_CHANGED',
          targetType: 'FACTION',
          targetId: factionMembership.factionId,
          targetName: factionMembership.faction.name,
          creditsDelta: influenceDelta * 4,
          influenceDelta,
          summary,
          createdAt: now.toISOString(),
        });
      }
    }

    return { actions };
  }

  private async upsertRelationship(
    sourceId: string,
    targetType: string,
    targetId: string,
    relationshipType: RelationshipType,
    delta: number,
  ) {
    const existing = await this.prisma.relationship.findFirst({
      where: {
        sourceType: 'CHARACTER',
        sourceId,
        targetType,
        targetId,
        relationshipType,
      },
    });

    if (existing) {
      await this.prisma.relationship.update({
        where: { id: existing.id },
        data: { value: existing.value + delta },
      });
      return;
    }

    await this.prisma.relationship.create({
      data: {
        sourceType: 'CHARACTER',
        sourceId,
        targetType,
        targetId,
        relationshipType,
        value: delta,
      },
    });
  }
}
