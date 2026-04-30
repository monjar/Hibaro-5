import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminItemDefinitionInput, ItemsService } from './items.service';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'Get all item definitions' })
  findAll() {
    return this.itemsService.findAllDefinitions();
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get item definition by ID' })
  findOne(@Param('id') id: string) {
    return this.itemsService.findDefinitionById(id);
  }

  @Post('definitions')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create an item definition (admin)' })
  create(@Body() body: AdminItemDefinitionInput) {
    return this.itemsService.createDefinition(body);
  }

  @Patch('definitions/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update an item definition (admin)' })
  update(@Param('id') id: string, @Body() body: Partial<AdminItemDefinitionInput>) {
    return this.itemsService.updateDefinition(id, body);
  }

  @Delete('definitions/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete an item definition (admin)' })
  remove(@Param('id') id: string) {
    return this.itemsService.deleteDefinition(id);
  }
}
