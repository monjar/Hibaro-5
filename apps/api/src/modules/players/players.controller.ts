import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID' })
  findOne(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.playersService.findByIdentifier(id, player);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get player activity log' })
  getActivity(
    @Param('id') id: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.playersService.getActivity(id, player, parseInt(page, 10), parseInt(limit, 10));
  }
}
