import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { StocksService } from './stocks.service';

@ApiTags('stocks')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('market')
  @ApiOperation({ summary: 'Get current corporate stock market quotes' })
  getMarket() {
    return this.stocksService.getMarket();
  }

  @Get('history/:corporationId')
  @ApiOperation({ summary: 'Get recent price history for a corporation' })
  getHistory(
    @Param('corporationId') corporationId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Math.min(Math.max(parseInt(limit, 10) || 30, 1), 200) : 30;
    return this.stocksService.getHistory(corporationId, parsed);
  }

  @Get('holdings/:characterId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a character stock portfolio' })
  getHoldings(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.stocksService.getHoldings(characterId, player.sub);
  }

  @Post('buy')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Buy corporation shares' })
  buy(
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string; corporationId: string; shares: number },
  ) {
    return this.stocksService.buy(body.characterId, player.sub, body.corporationId, body.shares);
  }

  @Post('sell')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Sell corporation shares' })
  sell(
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string; corporationId: string; shares: number },
  ) {
    return this.stocksService.sell(body.characterId, player.sub, body.corporationId, body.shares);
  }
}
