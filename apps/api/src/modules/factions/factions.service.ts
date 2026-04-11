import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.faction.findMany({
      include: { headquartersBuilding: true, districts: true },
    });
  }

  async findById(id: string) {
    const faction = await this.prisma.faction.findUnique({
      where: { id },
      include: { headquartersBuilding: true, districts: true, memberships: { take: 10 } },
    });
    if (!faction) throw new NotFoundException(`Faction ${id} not found`);
    return faction;
  }
}
