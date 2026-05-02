import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCategory, ItemRarity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const CATEGORIES: ItemCategory[] = [
  'TOOL',
  'WEAPON',
  'CLOTHING',
  'VEHICLE',
  'CONSUMABLE',
  'MATERIAL',
  'QUEST_ITEM',
];

const RARITIES: ItemRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'ILLEGAL',
];

export interface AdminItemDefinitionInput {
  name: string;
  description?: string | null;
  category: ItemCategory;
  rarity?: ItemRarity;
  baseValue?: number;
  weight?: number;
  effects?: unknown;
  requirements?: unknown;
  weaponData?: unknown;
  clothingData?: unknown;
  toolData?: unknown;
  vehicleData?: unknown;
}

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAllDefinitions() {
    return this.prisma.itemDefinition.findMany({ orderBy: { name: 'asc' } });
  }

  async findDefinitionById(id: string) {
    const item = await this.prisma.itemDefinition.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Item definition ${id} not found`);
    return item;
  }

  async createDefinition(data: AdminItemDefinitionInput) {
    this.validate(data);
    return this.prisma.itemDefinition.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        rarity: data.rarity ?? 'COMMON',
        baseValue: data.baseValue ?? 0,
        weight: data.weight ?? 0,
        effects: (data.effects ?? null) as never,
        requirements: (data.requirements ?? null) as never,
        weaponData: (data.weaponData ?? null) as never,
        clothingData: (data.clothingData ?? null) as never,
        toolData: (data.toolData ?? null) as never,
        vehicleData: (data.vehicleData ?? null) as never,
      },
    });
  }

  async updateDefinition(id: string, data: Partial<AdminItemDefinitionInput>) {
    await this.findDefinitionById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.category && !CATEGORIES.includes(data.category)) {
      throw new BadRequestException(`category must be one of ${CATEGORIES.join(', ')}`);
    }
    if (data.rarity && !RARITIES.includes(data.rarity)) {
      throw new BadRequestException(`rarity must be one of ${RARITIES.join(', ')}`);
    }
    return this.prisma.itemDefinition.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.rarity !== undefined ? { rarity: data.rarity } : {}),
        ...(data.baseValue !== undefined ? { baseValue: data.baseValue } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.effects !== undefined ? { effects: (data.effects ?? null) as never } : {}),
        ...(data.requirements !== undefined
          ? { requirements: (data.requirements ?? null) as never }
          : {}),
        ...(data.weaponData !== undefined
          ? { weaponData: (data.weaponData ?? null) as never }
          : {}),
        ...(data.clothingData !== undefined
          ? { clothingData: (data.clothingData ?? null) as never }
          : {}),
        ...(data.toolData !== undefined ? { toolData: (data.toolData ?? null) as never } : {}),
        ...(data.vehicleData !== undefined
          ? { vehicleData: (data.vehicleData ?? null) as never }
          : {}),
      },
    });
  }

  async deleteDefinition(id: string) {
    await this.findDefinitionById(id);
    const instances = await this.prisma.itemInstance.count({ where: { itemDefinitionId: id } });
    if (instances > 0) {
      throw new BadRequestException(
        `Cannot delete item definition: ${instances} instance(s) still in the world.`,
      );
    }
    await this.prisma.itemDefinition.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validate(input: AdminItemDefinitionInput) {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('Item name must be at least 2 characters');
    }
    if (!input.category) {
      throw new BadRequestException('category is required');
    }
    if (!CATEGORIES.includes(input.category)) {
      throw new BadRequestException(`category must be one of ${CATEGORIES.join(', ')}`);
    }
    if (input.rarity && !RARITIES.includes(input.rarity)) {
      throw new BadRequestException(`rarity must be one of ${RARITIES.join(', ')}`);
    }
    if (input.baseValue !== undefined && input.baseValue < 0) {
      throw new BadRequestException('baseValue cannot be negative');
    }
    if (input.weight !== undefined && input.weight < 0) {
      throw new BadRequestException('weight cannot be negative');
    }
  }
}
