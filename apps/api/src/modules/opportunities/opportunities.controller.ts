import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
  findAvailable(@Param('characterId') characterId: string) {
    return this.opportunitiesService.findAvailableForCharacter(characterId);
  }

  @Get('instances/:characterId')
  @ApiOperation({ summary: 'Get opportunity instances for a character' })
  findInstances(@Param('characterId') characterId: string) {
    return this.opportunitiesService.findInstancesForCharacter(characterId);
  }

  @Post(':opportunityId/accept')
  @ApiOperation({ summary: 'Accept an opportunity' })
  accept(@Param('opportunityId') opportunityId: string, @Body() body: { characterId: string }) {
    return this.opportunitiesService.acceptOpportunity(opportunityId, body.characterId);
  }

  @Post('instances/:instanceId/resolve')
  @ApiOperation({ summary: 'Manually resolve an opportunity instance (dev)' })
  resolve(@Param('instanceId') instanceId: string) {
    return this.opportunitiesService.resolveInstance(instanceId);
  }
}
