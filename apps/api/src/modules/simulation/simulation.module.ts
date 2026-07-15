import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationScheduler } from './simulation.scheduler';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { WorldEventsModule } from '../world-events/world-events.module';
import { JobsModule } from '../jobs/jobs.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, OpportunitiesModule, WorldEventsModule, JobsModule, RealtimeModule],
  controllers: [SimulationController],
  providers: [SimulationService, SimulationScheduler],
})
export class SimulationModule {}
