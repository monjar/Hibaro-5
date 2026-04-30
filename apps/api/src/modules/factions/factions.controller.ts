import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FactionsService } from './factions.service';

@ApiTags('factions')
@Controller('factions')
export class FactionsController {
  constructor(private readonly factionsService: FactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all factions' })
  findAll() {
    return this.factionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get faction by ID' })
  findOne(@Param('id') id: string) {
    return this.factionsService.findById(id);
  }
}
