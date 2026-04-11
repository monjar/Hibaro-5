import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CorporationsService } from './corporations.service';

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
}
