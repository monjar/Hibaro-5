import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { CharactersService } from './characters.service';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get character by ID' })
  findOne(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.findById(id, player.sub);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get character summary with memberships and recent activity' })
  getSummary(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.getSummary(id, player.sub);
  }

  @Get(':id/relationships')
  @ApiOperation({ summary: 'Get character relationships' })
  getRelationships(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.getRelationships(id, player.sub);
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Get character inventory' })
  getInventory(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.getInventory(id, player.sub);
  }

  @Get(':id/location')
  @ApiOperation({ summary: 'Get character current location' })
  getLocation(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.getLocation(id, player.sub);
  }

  @Post(':id/travel')
  @ApiOperation({ summary: 'Travel to a new location' })
  travel(
    @Param('id') id: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { planetId?: string; districtId?: string; buildingId?: string },
  ) {
    return this.charactersService.travel(id, player.sub, body);
  }

  @Post(':id/travel/quote')
  @ApiOperation({ summary: 'Quote the cost and risk of travel without committing' })
  travelQuote(
    @Param('id') id: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { planetId?: string; districtId?: string; buildingId?: string },
  ) {
    return this.charactersService.travelQuote(id, player.sub, body);
  }

  @Post(':id/rest')
  @ApiOperation({ summary: 'Rest at the current building (safehouse, clinic, or hub) for recovery' })
  rest(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.rest(id, player.sub);
  }

  @Post(':id/rest/stop')
  @ApiOperation({ summary: 'Stop an active rest session and keep the recovery earned so far' })
  stopRest(@Param('id') id: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.charactersService.stopRest(id, player.sub);
  }

  @Post(':id/items/:itemInstanceId/use')
  @ApiOperation({ summary: 'Consume an item from inventory' })
  useItem(
    @Param('id') id: string,
    @Param('itemInstanceId') itemInstanceId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.charactersService.useItem(id, player.sub, itemInstanceId);
  }
}
