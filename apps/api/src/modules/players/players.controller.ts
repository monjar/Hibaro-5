import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlayersService } from './players.service';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID' })
  findOne(@Param('id') id: string) {
    return this.playersService.findById(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get player activity log' })
  getActivity(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.playersService.getActivity(id, parseInt(page), parseInt(limit));
  }
}
