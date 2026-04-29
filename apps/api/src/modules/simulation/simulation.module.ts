import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationScheduler } from './simulation.scheduler';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { WorldEventsModule } from '../world-events/world-events.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [OpportunitiesModule, WorldEventsModule, JobsModule],
  controllers: [SimulationController],
  providers: [SimulationService, SimulationScheduler],
})
export class SimulationModule {}
