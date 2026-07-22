import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
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

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all players (admin)' })
  listAll() {
    return this.playersService.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID' })
  findOne(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.playersService.findByIdentifier(id, player);
  }

  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a player admin flag (admin)' })
  updateAdminStatus(
    @Param('id') id: string,
    @Body() body: { isAdmin: boolean },
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.playersService.updateAdminStatus(id, body.isAdmin, player);
  }

  @Get(':id/daily')
  @ApiOperation({ summary: 'Daily supply-drop status (streak, next reward)' })
  getDailyStatus(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.playersService.getDailyStatus(id, player);
  }

  @Post(':id/daily/claim')
  @ApiOperation({ summary: 'Claim the daily supply drop' })
  claimDaily(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.playersService.claimDaily(id, player);
  }

  @Get(':id/achievements')
  @ApiOperation({ summary: 'Achievement list with progress and claim state' })
  getAchievements(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.playersService.getAchievements(id, player);
  }

  @Post(':id/achievements/:achievementId/claim')
  @ApiOperation({ summary: 'Claim an unlocked achievement reward' })
  claimAchievement(
    @Param('id') id: string,
    @Param('achievementId') achievementId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.playersService.claimAchievement(id, achievementId, player);
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
