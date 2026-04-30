import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CharactersService } from './characters.service';

@ApiTags('characters')
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get character by ID' })
  findOne(@Param('id') id: string) {
    return this.charactersService.findById(id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get character summary with memberships and recent activity' })
  getSummary(@Param('id') id: string) {
    return this.charactersService.getSummary(id);
  }

  @Get(':id/relationships')
  @ApiOperation({ summary: 'Get character relationships' })
  getRelationships(@Param('id') id: string) {
    return this.charactersService.getRelationships(id);
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Get character inventory' })
  getInventory(@Param('id') id: string) {
    return this.charactersService.getInventory(id);
  }

  @Get(':id/location')
  @ApiOperation({ summary: 'Get character current location' })
  getLocation(@Param('id') id: string) {
    return this.charactersService.getLocation(id);
  }

  @Post(':id/travel')
  @ApiOperation({ summary: 'Travel to a new location' })
  travel(
    @Param('id') id: string,
    @Body() body: { planetId?: string; districtId?: string; buildingId?: string },
  ) {
    return this.charactersService.travel(id, body);
  }
}
