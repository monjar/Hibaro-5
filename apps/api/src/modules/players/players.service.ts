import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedPlayer } from '../auth/auth.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async findByIdentifier(identifier: string, currentPlayer: AuthenticatedPlayer) {
    if (identifier !== currentPlayer.sub && identifier !== currentPlayer.username) {
      throw new ForbiddenException('You can only access your own player record');
    }

    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ id: currentPlayer.sub }, { username: currentPlayer.username }],
      },
      include: { character: true },
    });
    if (!player) throw new NotFoundException(`Player ${identifier} not found`);

    const safePlayer: Partial<typeof player> = { ...player };
    delete safePlayer.passwordHash;
    return safePlayer as Omit<typeof player, 'passwordHash'>;
  }

  async getActivity(identifier: string, currentPlayer: AuthenticatedPlayer, page = 1, limit = 20) {
    const player = await this.findByIdentifier(identifier, currentPlayer);
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { playerId: player.id } }),
    ]);
    return { logs, total, page, limit };
  }
}
