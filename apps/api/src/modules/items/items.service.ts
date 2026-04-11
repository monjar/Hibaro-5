import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAllDefinitions() {
    return this.prisma.itemDefinition.findMany();
  }

  async findDefinitionById(id: string) {
    const item = await this.prisma.itemDefinition.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Item definition ${id} not found`);
    return item;
  }
}
