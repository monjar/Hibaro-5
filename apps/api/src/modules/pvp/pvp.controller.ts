import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { PvpService } from './pvp.service';

@ApiTags('pvp')
@Controller('pvp')
export class PvpController {
  constructor(private readonly pvpService: PvpService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Public operator standings' })
  leaderboard() {
    return this.pvpService.leaderboard();
  }

  @Get('players/:characterId')
  @ApiOperation({ summary: 'Player characters in your current district' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  playersNearby(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.pvpService.playersNearby(characterId, player.sub);
  }

  @Post('duel')
  @ApiOperation({ summary: 'Challenge a player in your district to a duel' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  duel(
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string; targetId: string; wager: number },
  ) {
    return this.pvpService.startDuel(
      player.sub,
      String(body?.characterId ?? ''),
      String(body?.targetId ?? ''),
      Number(body?.wager),
    );
  }

  @Get('duels/:characterId')
  @ApiOperation({ summary: 'Recent duels involving your character' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  duels(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Query('limit') limit?: string,
  ) {
    return this.pvpService.duelHistory(characterId, player.sub, limit ? Number(limit) : 15);
  }

  @Get('bounties')
  @ApiOperation({ summary: 'Open player bounties' })
  bounties() {
    return this.pvpService.openBounties();
  }

  @Post('bounties')
  @ApiOperation({ summary: 'Post a bounty on another player (credits are escrowed)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  postBounty(
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string; targetId: string; amount: number; reason?: string },
  ) {
    return this.pvpService.postBounty(
      player.sub,
      String(body?.characterId ?? ''),
      String(body?.targetId ?? ''),
      Number(body?.amount),
      body?.reason,
    );
  }

  @Post('bounties/:id/claim')
  @ApiOperation({ summary: 'Attempt to claim a bounty (must be in the target district)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  claimBounty(
    @Param('id') id: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string },
  ) {
    return this.pvpService.claimBounty(player.sub, String(body?.characterId ?? ''), id);
  }

  @Post('bounties/:id/cancel')
  @ApiOperation({ summary: 'Cancel your open bounty and refund the escrow' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  cancelBounty(
    @Param('id') id: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string },
  ) {
    return this.pvpService.cancelBounty(player.sub, String(body?.characterId ?? ''), id);
  }
}
