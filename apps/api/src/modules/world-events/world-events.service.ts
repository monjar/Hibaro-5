import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorldEventsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.worldEvent.findMany({ orderBy: { startsAt: 'desc' } });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.worldEvent.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    });
  }
}
