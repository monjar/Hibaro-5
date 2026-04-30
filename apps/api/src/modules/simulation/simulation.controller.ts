import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SimulationService } from './simulation.service';

@ApiTags('simulation')
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('tick')
  @ApiOperation({ summary: 'Run simulation tick - resolves all due opportunities and events' })
  tick() {
    return this.simulationService.tick();
  }

  @Get('world-state')
  @ApiOperation({ summary: 'Get current world state snapshot' })
  worldState() {
    return this.simulationService.getWorldState();
  }
}
