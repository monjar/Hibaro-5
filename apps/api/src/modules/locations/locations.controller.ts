import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import {
  AdminBuildingInput,
  AdminDistrictInput,
  AdminDistrictMapInput,
  AdminPlanetInput,
  LocationsService,
} from './locations.service';

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

  @Get('districts')
  @ApiOperation({ summary: 'Get all districts' })
  getDistricts() {
    return this.locationsService.getDistricts();
  }

  @Get('districts/:id')
  @ApiOperation({ summary: 'Get district by ID' })
  getDistrict(@Param('id') id: string) {
    return this.locationsService.getDistrictById(id);
  }

  @Get('buildings')
  @ApiOperation({ summary: 'Get all buildings' })
  getBuildings() {
    return this.locationsService.getBuildings();
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get building by ID' })
  getBuilding(@Param('id') id: string) {
    return this.locationsService.getBuildingById(id);
  }

  // Planet admin
  @Post('planets')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a planet (admin)' })
  createPlanet(@Body() body: AdminPlanetInput) {
    return this.locationsService.createPlanet(body);
  }

  @Patch('planets/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a planet (admin)' })
  updatePlanet(@Param('id') id: string, @Body() body: Partial<AdminPlanetInput>) {
    return this.locationsService.updatePlanet(id, body);
  }

  @Delete('planets/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a planet (admin)' })
  deletePlanet(@Param('id') id: string) {
    return this.locationsService.deletePlanet(id);
  }

  // District admin
  @Post('districts')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a district (admin)' })
  createDistrict(@Body() body: AdminDistrictInput) {
    return this.locationsService.createDistrict(body);
  }

  @Patch('districts/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a district (admin)' })
  updateDistrict(@Param('id') id: string, @Body() body: Partial<AdminDistrictInput>) {
    return this.locationsService.updateDistrict(id, body);
  }

  @Delete('districts/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a district (admin)' })
  deleteDistrict(@Param('id') id: string) {
    return this.locationsService.deleteDistrict(id);
  }

  @Patch('districts/:id/map')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a district map layout (admin)' })
  updateDistrictMap(@Param('id') id: string, @Body() body: AdminDistrictMapInput) {
    return this.locationsService.updateDistrictMap(id, body);
  }

  // Building admin
  @Post('buildings')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a building (admin)' })
  createBuilding(@Body() body: AdminBuildingInput) {
    return this.locationsService.createBuilding(body);
  }

  @Patch('buildings/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a building (admin)' })
  updateBuilding(@Param('id') id: string, @Body() body: Partial<AdminBuildingInput>) {
    return this.locationsService.updateBuilding(id, body);
  }

  @Delete('buildings/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a building (admin)' })
  deleteBuilding(@Param('id') id: string) {
    return this.locationsService.deleteBuilding(id);
  }
}
