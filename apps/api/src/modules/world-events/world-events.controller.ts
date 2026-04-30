import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WorldEventsService } from './world-events.service';

@ApiTags('world-events')
@Controller('world-events')
export class WorldEventsController {
  constructor(private readonly worldEventsService: WorldEventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all world events' })
  findAll() {
    return this.worldEventsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active world events' })
  findActive() {
    return this.worldEventsService.findActive();
  }
}
