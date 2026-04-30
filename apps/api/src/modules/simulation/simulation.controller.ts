import { Controller, Post, Get, Query } from '@nestjs/common';
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

  @Get('history')
  @ApiOperation({ summary: 'Get recent simulation tick history' })
  history(@Query('limit') limit = '10') {
    return this.simulationService.getHistory(parseInt(limit, 10));
  }

  @Get('realtime-contracts')
  @ApiOperation({ summary: 'Get shared realtime event contracts' })
  realtimeContracts() {
    return this.simulationService.getRealtimeContracts();
  }
}
