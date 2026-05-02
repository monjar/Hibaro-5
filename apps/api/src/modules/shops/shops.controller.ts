import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get(':buildingId')
  @ApiOperation({ summary: 'List items for sale at a shop building' })
  list(@Param('buildingId') buildingId: string) {
    return this.shopsService.listShop(buildingId);
  }

  @Post(':buildingId/buy')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Buy an item from the shop (must be inside the building)' })
  buy(
    @Param('buildingId') buildingId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { itemInstanceId: string; characterId: string },
  ) {
    return this.shopsService.buy(buildingId, body.itemInstanceId, body.characterId, player.sub);
  }

  @Post(':buildingId/sell')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Sell an owned item to the shop (must be inside the building)' })
  sell(
    @Param('buildingId') buildingId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { itemInstanceId: string; characterId: string },
  ) {
    return this.shopsService.sell(buildingId, body.itemInstanceId, body.characterId, player.sub);
  }
}
