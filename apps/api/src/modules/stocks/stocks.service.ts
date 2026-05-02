import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_SHARES_PER_TRADE = 10000;

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  async getMarket() {
    const corporations = await this.prisma.corporation.findMany({
      where: { stockTicker: { not: null } },
      orderBy: { name: 'asc' },
    });

    const ids = corporations.map((c) => c.id);
    const recent = await this.prisma.stockPriceHistory.findMany({
      where: { corporationId: { in: ids } },
      orderBy: { recordedAt: 'desc' },
      take: ids.length * 24,
    });
    const byCorp = new Map<string, number[]>();
    for (const row of recent) {
      const list = byCorp.get(row.corporationId) ?? [];
      if (list.length < 24) {
        list.push(row.price);
        byCorp.set(row.corporationId, list);
      }
    }

    return corporations.map((corp) => {
      const history = (byCorp.get(corp.id) ?? []).slice().reverse();
      const previous = history.length >= 2 ? history[history.length - 2] : null;
      const current = corp.stockPrice ?? null;
      const delta =
        current !== null && previous !== null
          ? Number((current - previous).toFixed(2))
          : null;
      const percentChange =
        delta !== null && previous && previous > 0
          ? Number(((delta / previous) * 100).toFixed(2))
          : null;
      return {
        corporationId: corp.id,
        name: corp.name,
        industry: corp.industry,
        status: corp.status,
        stockTicker: corp.stockTicker,
        stockPrice: current,
        stockVolatility: corp.stockVolatility,
        riskOfBankruptcy: corp.riskOfBankruptcy,
        previousPrice: previous,
        delta,
        percentChange,
        sparkline: history,
      };
    });
  }

  async getHistory(corporationId: string, limit = 30) {
    const corp = await this.prisma.corporation.findUnique({ where: { id: corporationId } });
    if (!corp) throw new NotFoundException(`Corporation ${corporationId} not found`);
    const rows = await this.prisma.stockPriceHistory.findMany({
      where: { corporationId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return {
      corporationId,
      corporationName: corp.name,
      stockTicker: corp.stockTicker,
      points: rows
        .map((r) => ({ price: r.price, recordedAt: r.recordedAt.toISOString() }))
        .reverse(),
    };
  }

  async getHoldings(characterId: string, playerId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only view your own holdings');
    }

    const holdings = await this.prisma.stockHolding.findMany({
      where: { characterId },
      include: { corporation: true },
      orderBy: { acquiredAt: 'desc' },
    });

    return holdings.map((h) => ({
      id: h.id,
      corporationId: h.corporationId,
      corporationName: h.corporation.name,
      stockTicker: h.corporation.stockTicker,
      shares: h.shares,
      averagePrice: h.averagePrice,
      currentPrice: h.corporation.stockPrice ?? 0,
      marketValue: (h.corporation.stockPrice ?? 0) * h.shares,
      unrealizedPL: ((h.corporation.stockPrice ?? 0) - h.averagePrice) * h.shares,
    }));
  }

  async buy(
    characterId: string,
    playerId: string,
    corporationId: string,
    shares: number,
  ) {
    if (!Number.isInteger(shares) || shares <= 0 || shares > MAX_SHARES_PER_TRADE) {
      throw new BadRequestException(`Shares must be an integer between 1 and ${MAX_SHARES_PER_TRADE}`);
    }

    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only trade with your own credits');
    }

    const corporation = await this.prisma.corporation.findUnique({ where: { id: corporationId } });
    if (!corporation) throw new NotFoundException(`Corporation ${corporationId} not found`);
    if (!corporation.stockPrice || !corporation.stockTicker) {
      throw new BadRequestException(`${corporation.name} is not publicly traded`);
    }
    if (corporation.status === 'BANKRUPT') {
      throw new BadRequestException(`${corporation.name} is bankrupt`);
    }

    const totalCost = corporation.stockPrice * shares;
    const fee = Math.max(2, totalCost * 0.005);
    const totalDebit = totalCost + fee;

    if (character.credits < totalDebit) {
      throw new BadRequestException(
        `Insufficient credits: need ${totalDebit.toFixed(2)} (cost ${totalCost.toFixed(2)} + fee ${fee.toFixed(2)})`,
      );
    }

    const existing = await this.prisma.stockHolding.findUnique({
      where: {
        characterId_corporationId: { characterId, corporationId },
      },
    });

    const newShares = (existing?.shares ?? 0) + shares;
    const newAvgPrice = existing
      ? (existing.averagePrice * existing.shares + corporation.stockPrice * shares) / newShares
      : corporation.stockPrice;

    await this.prisma.$transaction([
      this.prisma.character.update({
        where: { id: characterId },
        data: { credits: character.credits - totalDebit },
      }),
      existing
        ? this.prisma.stockHolding.update({
            where: { id: existing.id },
            data: { shares: newShares, averagePrice: newAvgPrice },
          })
        : this.prisma.stockHolding.create({
            data: {
              characterId,
              corporationId,
              shares: newShares,
              averagePrice: newAvgPrice,
            },
          }),
      this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId,
          type: 'ITEM_BOUGHT',
          message: `${character.name} bought ${shares} shares of ${corporation.stockTicker} at ${corporation.stockPrice.toFixed(2)} credits`,
          relatedEntities: {
            corporationId,
            shares,
            pricePerShare: corporation.stockPrice,
            totalCost,
            fee,
          },
        },
      }),
    ]);

    return {
      success: true,
      shares,
      pricePerShare: corporation.stockPrice,
      totalCost,
      fee,
      newHolding: { shares: newShares, averagePrice: newAvgPrice },
    };
  }

  async sell(
    characterId: string,
    playerId: string,
    corporationId: string,
    shares: number,
  ) {
    if (!Number.isInteger(shares) || shares <= 0) {
      throw new BadRequestException(`Shares must be a positive integer`);
    }

    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only sell your own holdings');
    }

    const holding = await this.prisma.stockHolding.findUnique({
      where: {
        characterId_corporationId: { characterId, corporationId },
      },
      include: { corporation: true },
    });
    if (!holding) throw new NotFoundException(`No holdings for that corporation`);
    if (holding.shares < shares) {
      throw new BadRequestException(
        `You only own ${holding.shares} shares (requested ${shares})`,
      );
    }

    const stockPrice = holding.corporation.stockPrice ?? 0;
    const proceeds = stockPrice * shares;
    const fee = Math.max(2, proceeds * 0.005);
    const credit = proceeds - fee;
    const realizedPL = (stockPrice - holding.averagePrice) * shares - fee;

    const remainingShares = holding.shares - shares;

    await this.prisma.$transaction([
      this.prisma.character.update({
        where: { id: characterId },
        data: { credits: character.credits + credit },
      }),
      remainingShares === 0
        ? this.prisma.stockHolding.delete({ where: { id: holding.id } })
        : this.prisma.stockHolding.update({
            where: { id: holding.id },
            data: { shares: remainingShares },
          }),
      this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId,
          type: 'ITEM_SOLD',
          message: `${character.name} sold ${shares} shares of ${holding.corporation.stockTicker} at ${stockPrice.toFixed(2)} credits (${realizedPL >= 0 ? '+' : ''}${realizedPL.toFixed(2)} P/L)`,
          relatedEntities: {
            corporationId,
            shares,
            pricePerShare: stockPrice,
            proceeds,
            fee,
            realizedPL,
          },
        },
      }),
    ]);

    return {
      success: true,
      shares,
      pricePerShare: stockPrice,
      proceeds,
      fee,
      realizedPL,
      remainingShares,
    };
  }
}
