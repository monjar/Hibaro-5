import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminWorldEventInput, WorldEventsService } from './world-events.service';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a world event by id' })
  findOne(@Param('id') id: string) {
    return this.worldEventsService.findById(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a world event (admin)' })
  create(@Body() body: AdminWorldEventInput) {
    return this.worldEventsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a world event (admin)' })
  update(@Param('id') id: string, @Body() body: Partial<AdminWorldEventInput>) {
    return this.worldEventsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a world event (admin)' })
  remove(@Param('id') id: string) {
    return this.worldEventsService.delete(id);
  }
}
