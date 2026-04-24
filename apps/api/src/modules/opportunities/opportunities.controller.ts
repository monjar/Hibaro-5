import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all opportunity definitions' })
  findAll() {
    return this.opportunitiesService.findAll();
  }

  @Get('available/:characterId')
  @ApiOperation({ summary: 'Get available opportunities for a character' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  findAvailable(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.opportunitiesService.findAvailableForCharacter(characterId, player.sub);
  }

  @Get('instances/:characterId')
  @ApiOperation({ summary: 'Get opportunity instances for a character' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  findInstances(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.opportunitiesService.findInstancesForCharacter(characterId, player.sub);
  }

  @Post(':opportunityId/accept')
  @ApiOperation({ summary: 'Accept an opportunity' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  accept(
    @Param('opportunityId') opportunityId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string },
  ) {
    return this.opportunitiesService.acceptOpportunity(opportunityId, body.characterId, player.sub);
  }

  @Post('instances/:instanceId/resolve')
  @ApiOperation({ summary: 'Manually resolve an opportunity instance (dev)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  resolve(@Param('instanceId') instanceId: string, @CurrentPlayer() player: AuthenticatedPlayer) {
    return this.opportunitiesService.resolveInstance(instanceId, player.sub);
  }
}
