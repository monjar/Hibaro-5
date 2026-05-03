import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedPlayer } from '../auth/auth.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async listAll() {
    const players = await this.prisma.player.findMany({
      orderBy: [{ isAdmin: 'desc' }, { lastLoginAt: 'desc' }, { createdAt: 'desc' }],
      include: { character: true },
    });

    return players.map((player) => this.sanitizePlayer(player));
  }

  async findByIdentifier(identifier: string, currentPlayer: AuthenticatedPlayer) {
    if (identifier !== currentPlayer.sub && identifier !== currentPlayer.username) {
      throw new ForbiddenException('You can only access your own player record');
    }

    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      include: { character: true },
    });
    if (!player) throw new NotFoundException(`Player ${identifier} not found`);

    return this.sanitizePlayer(player);
  }

  async updateAdminStatus(
    identifier: string,
    isAdmin: boolean,
    currentPlayer: AuthenticatedPlayer,
  ) {
    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      include: { character: true },
    });
    if (!player) {
      throw new NotFoundException(`Player ${identifier} not found`);
    }
    if (player.id === currentPlayer.sub && !isAdmin) {
      throw new BadRequestException('You cannot remove your own admin access from this screen');
    }

    const updated = await this.prisma.player.update({
      where: { id: player.id },
      data: { isAdmin },
      include: { character: true },
    });

    return this.sanitizePlayer(updated);
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

  private sanitizePlayer<T extends { passwordHash: string }>(player: T): Omit<T, 'passwordHash'> {
    const safePlayer: Partial<T> = { ...player };
    delete safePlayer.passwordHash;
    return safePlayer as Omit<T, 'passwordHash'>;
  }
}
