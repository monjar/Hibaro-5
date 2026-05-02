import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminFactionInput, FactionsService } from './factions.service';

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

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a faction (admin)' })
  create(@Body() body: AdminFactionInput) {
    return this.factionsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a faction (admin)' })
  update(@Param('id') id: string, @Body() body: Partial<AdminFactionInput>) {
    return this.factionsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a faction (admin)' })
  remove(@Param('id') id: string) {
    return this.factionsService.delete(id);
  }
}
