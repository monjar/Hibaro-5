import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminCorporationInput, CorporationsService } from './corporations.service';

@ApiTags('corporations')
@Controller('corporations')
export class CorporationsController {
  constructor(private readonly corporationsService: CorporationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all corporations' })
  findAll() {
    return this.corporationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get corporation by ID' })
  findOne(@Param('id') id: string) {
    return this.corporationsService.findById(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a corporation (admin)' })
  create(@Body() body: AdminCorporationInput) {
    return this.corporationsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a corporation (admin)' })
  update(@Param('id') id: string, @Body() body: Partial<AdminCorporationInput>) {
    return this.corporationsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a corporation (admin)' })
  remove(@Param('id') id: string) {
    return this.corporationsService.delete(id);
  }
}
