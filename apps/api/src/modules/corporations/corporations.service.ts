import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CorporationIndustry, CorporationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const INDUSTRIES: CorporationIndustry[] = [
  'MINING',
  'WEAPONS',
  'TRANSPORT',
  'CYBERNETICS',
  'FOOD',
  'SECURITY',
  'MEDIA',
  'ENERGY',
  'MEDICAL',
  'LOGISTICS',
  'BLACK_MARKET',
];

const STATUSES: CorporationStatus[] = ['GROWING', 'STABLE', 'DECLINING', 'BANKRUPT'];

export interface AdminCorporationInput {
  name: string;
  description?: string | null;
  industry: CorporationIndustry;
  headquartersBuildingId?: string | null;
  cash?: number;
  debt?: number;
  revenue?: number;
  riskOfBankruptcy?: number;
  politicalInfluence?: number;
  status?: CorporationStatus;
  stockTicker?: string | null;
  stockPrice?: number | null;
  stockVolatility?: number | null;
}

@Injectable()
export class CorporationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.corporation.findMany({ include: { headquartersBuilding: true } });
  }

  async findById(id: string) {
    const corp = await this.prisma.corporation.findUnique({
      where: { id },
      include: { headquartersBuilding: true, employments: { take: 10 } },
    });
    if (!corp) throw new NotFoundException(`Corporation ${id} not found`);
    return corp;
  }

  async create(data: AdminCorporationInput) {
    this.validate(data);
    if (data.headquartersBuildingId) {
      const building = await this.prisma.building.findUnique({
        where: { id: data.headquartersBuildingId },
      });
      if (!building)
        throw new BadRequestException(`Building ${data.headquartersBuildingId} not found`);
    }
    return this.prisma.corporation.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        industry: data.industry,
        headquartersBuildingId: data.headquartersBuildingId ?? null,
        cash: data.cash ?? 0,
        debt: data.debt ?? 0,
        revenue: data.revenue ?? 0,
        riskOfBankruptcy: data.riskOfBankruptcy ?? 0,
        politicalInfluence: data.politicalInfluence ?? 0,
        status: data.status ?? 'STABLE',
        stockTicker: data.stockTicker ?? null,
        stockPrice: data.stockPrice ?? null,
        stockVolatility: data.stockVolatility ?? null,
      },
    });
  }

  async update(id: string, data: Partial<AdminCorporationInput>) {
    await this.findById(id);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    if (data.industry && !INDUSTRIES.includes(data.industry)) {
      throw new BadRequestException(`industry must be one of ${INDUSTRIES.join(', ')}`);
    }
    if (data.status && !STATUSES.includes(data.status)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    if (data.headquartersBuildingId) {
      const building = await this.prisma.building.findUnique({
        where: { id: data.headquartersBuildingId },
      });
      if (!building)
        throw new BadRequestException(`Building ${data.headquartersBuildingId} not found`);
    }
    return this.prisma.corporation.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.industry !== undefined ? { industry: data.industry } : {}),
        ...(data.headquartersBuildingId !== undefined
          ? { headquartersBuildingId: data.headquartersBuildingId }
          : {}),
        ...(data.cash !== undefined ? { cash: data.cash } : {}),
        ...(data.debt !== undefined ? { debt: data.debt } : {}),
        ...(data.revenue !== undefined ? { revenue: data.revenue } : {}),
        ...(data.riskOfBankruptcy !== undefined ? { riskOfBankruptcy: data.riskOfBankruptcy } : {}),
        ...(data.politicalInfluence !== undefined
          ? { politicalInfluence: data.politicalInfluence }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.stockTicker !== undefined ? { stockTicker: data.stockTicker } : {}),
        ...(data.stockPrice !== undefined ? { stockPrice: data.stockPrice } : {}),
        ...(data.stockVolatility !== undefined ? { stockVolatility: data.stockVolatility } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    const employees = await this.prisma.corporationEmployment.count({
      where: { corporationId: id },
    });
    if (employees > 0) {
      throw new BadRequestException(
        `Cannot delete corporation: ${employees} employment record(s) still attached.`,
      );
    }
    const holders = await this.prisma.stockHolding.count({ where: { corporationId: id } });
    if (holders > 0) {
      throw new BadRequestException(
        `Cannot delete corporation: ${holders} player stock holding(s) still active.`,
      );
    }
    await this.prisma.stockPriceHistory.deleteMany({ where: { corporationId: id } });
    await this.prisma.relationship.deleteMany({
      where: {
        OR: [
          { sourceType: 'CORPORATION', sourceId: id },
          { targetType: 'CORPORATION', targetId: id },
        ],
      },
    });
    await this.prisma.corporation.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validate(input: AdminCorporationInput) {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException('Corporation name must be at least 2 characters');
    }
    if (!input.industry) {
      throw new BadRequestException('industry is required');
    }
    if (!INDUSTRIES.includes(input.industry)) {
      throw new BadRequestException(`industry must be one of ${INDUSTRIES.join(', ')}`);
    }
    if (input.status && !STATUSES.includes(input.status)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    if (input.cash !== undefined && input.cash < 0) {
      throw new BadRequestException('cash cannot be negative');
    }
    if (input.debt !== undefined && input.debt < 0) {
      throw new BadRequestException('debt cannot be negative');
    }
    if (
      input.riskOfBankruptcy !== undefined &&
      (input.riskOfBankruptcy < 0 || input.riskOfBankruptcy > 1)
    ) {
      throw new BadRequestException('riskOfBankruptcy must be between 0 and 1');
    }
  }
}
