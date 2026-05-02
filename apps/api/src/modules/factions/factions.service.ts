import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminFactionInput {
  name: string;
  description?: string | null;
  ideology?: string | null;
  headquartersBuildingId?: string | null;
  treasury?: number;
  influence?: number;
}

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

  async create(data: AdminFactionInput) {
    this.validate(data);
    if (data.headquartersBuildingId) {
      const building = await this.prisma.building.findUnique({
        where: { id: data.headquartersBuildingId },
      });
      if (!building)
        throw new BadRequestException(`Building ${data.headquartersBuildingId} not found`);
    }
    return this.prisma.faction.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        ideology: data.ideology ?? null,
        headquartersBuildingId: data.headquartersBuildingId ?? null,
        treasury: data.treasury ?? 0,
        influence: data.influence ?? 0,
      },
    });
  }

  async update(id: string, data: Partial<AdminFactionInput>) {
    await this.findById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.headquartersBuildingId) {
      const building = await this.prisma.building.findUnique({
        where: { id: data.headquartersBuildingId },
      });
      if (!building)
        throw new BadRequestException(`Building ${data.headquartersBuildingId} not found`);
    }
    return this.prisma.faction.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.ideology !== undefined ? { ideology: data.ideology } : {}),
        ...(data.headquartersBuildingId !== undefined
          ? { headquartersBuildingId: data.headquartersBuildingId }
          : {}),
        ...(data.treasury !== undefined ? { treasury: data.treasury } : {}),
        ...(data.influence !== undefined ? { influence: data.influence } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    const memberships = await this.prisma.factionMembership.count({ where: { factionId: id } });
    if (memberships > 0) {
      throw new BadRequestException(
        `Cannot delete faction: ${memberships} membership(s) still attached.`,
      );
    }
    const districts = await this.prisma.district.count({ where: { controllingFactionId: id } });
    if (districts > 0) {
      throw new BadRequestException(
        `Cannot delete faction: ${districts} district(s) still controlled.`,
      );
    }
    await this.prisma.relationship.deleteMany({
      where: {
        OR: [
          { sourceType: 'FACTION', sourceId: id },
          { targetType: 'FACTION', targetId: id },
        ],
      },
    });
    await this.prisma.faction.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validate(input: AdminFactionInput) {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('Faction name must be at least 2 characters');
    }
    if (input.treasury !== undefined && input.treasury < 0) {
      throw new BadRequestException('Treasury cannot be negative');
    }
  }
}
