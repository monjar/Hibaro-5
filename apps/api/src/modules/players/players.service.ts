import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { character: true },
    });
    if (!player) throw new NotFoundException(`Player ${id} not found`);
    return player;
  }

  async getActivity(id: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { playerId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { playerId: id } }),
    ]);
    return { logs, total, page, limit };
  }
}
