import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { WorldEventsModule } from '../world-events/world-events.module';

@Module({
  imports: [OpportunitiesModule, WorldEventsModule],
  controllers: [SimulationController],
  providers: [SimulationService],
})
export class SimulationModule {}
