import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SimulationService } from './simulation.service';

const DEFAULT_INTERVAL_MS = 30_000;

@Injectable()
export class SimulationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulationScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly simulationService: SimulationService) {}

  onModuleInit() {
    if (process.env.SIMULATION_AUTO_TICK === 'false') {
      this.logger.log('Auto-tick disabled by SIMULATION_AUTO_TICK=false');
      return;
    }
    const intervalMs = Number(process.env.SIMULATION_TICK_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
    this.logger.log(`Auto-tick enabled (every ${intervalMs}ms)`);

    this.timer = setInterval(() => this.runTick(), intervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runTick() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.simulationService.tick();
      const totals = result.totals;
      if (totals.opportunitiesResolved > 0 || totals.worldEventsActivated > 0) {
        this.logger.log(
          `Auto-tick: ${totals.opportunitiesResolved} ops, ${totals.worldEventsActivated}+ events, ${totals.npcActions} NPC actions`,
        );
      }
    } catch (error) {
      this.logger.error('Auto-tick failed', error as Error);
    } finally {
      this.running = false;
    }
  }
}
