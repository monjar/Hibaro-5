import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}
