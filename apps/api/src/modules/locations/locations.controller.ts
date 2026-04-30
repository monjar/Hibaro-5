import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('solar-systems')
  @ApiOperation({ summary: 'Get all solar systems' })
  getSolarSystems() {
    return this.locationsService.getSolarSystems();
  }

  @Get('planets')
  @ApiOperation({ summary: 'Get all planets' })
  getPlanets() {
    return this.locationsService.getPlanets();
  }

  @Get('planets/:id')
  @ApiOperation({ summary: 'Get planet by ID' })
  getPlanet(@Param('id') id: string) {
    return this.locationsService.getPlanetById(id);
  }

  @Get('districts/:id')
  @ApiOperation({ summary: 'Get district by ID' })
  getDistrict(@Param('id') id: string) {
    return this.locationsService.getDistrictById(id);
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get building by ID' })
  getBuilding(@Param('id') id: string) {
    return this.locationsService.getBuildingById(id);
  }
}
