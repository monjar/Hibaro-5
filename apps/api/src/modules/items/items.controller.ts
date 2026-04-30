import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ItemsService } from './items.service';

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
}
