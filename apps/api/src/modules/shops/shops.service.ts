import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SHOP_FUNCTIONS = ['SHOP', 'BLACK_MARKET', 'CLINIC'];

interface ItemModifiers {
  priceCredits?: number;
  contraband?: boolean;
  shopRestockKey?: string;
}

function readModifiers(value: unknown): ItemModifiers {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as ItemModifiers;
  }
  return {};
}

function priceFor(item: {
  modifiers: unknown;
  itemDefinition: { baseValue: number; rarity: string };
}) {
  const mods = readModifiers(item.modifiers);
  if (typeof mods.priceCredits === 'number') return mods.priceCredits;
  const rarityMultiplier: Record<string, number> = {
    COMMON: 1,
    UNCOMMON: 1.6,
    RARE: 2.5,
    EPIC: 4,
    LEGENDARY: 7,
    ILLEGAL: 3,
  };
  const mult = rarityMultiplier[item.itemDefinition.rarity] ?? 1;
  return Math.max(5, Math.round(item.itemDefinition.baseValue * mult));
}

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async listShop(buildingId: string) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException(`Building ${buildingId} not found`);

    const fnArr = Array.isArray(building.functionality) ? (building.functionality as string[]) : [];
    const isShop = fnArr.some((f) => SHOP_FUNCTIONS.includes(f));
    if (!isShop) throw new BadRequestException(`${building.name} is not a shop`);
    if (building.status !== 'OPEN') {
      throw new BadRequestException(`${building.name} is ${building.status}`);
    }

    const items = await this.prisma.itemInstance.findMany({
      where: { ownerType: 'BUILDING', ownerId: buildingId },
      include: { itemDefinition: true },
    });

    return {
      building: {
        id: building.id,
        name: building.name,
        description: building.description,
        functionality: fnArr,
        ownerType: building.ownerType,
        ownerId: building.ownerId,
      },
      stock: items.map((item) => ({
        id: item.id,
        itemDefinitionId: item.itemDefinitionId,
        name: item.itemDefinition.name,
        description: item.itemDefinition.description,
        category: item.itemDefinition.category,
        rarity: item.itemDefinition.rarity,
        condition: item.condition,
        weight: item.itemDefinition.weight,
        contraband: readModifiers(item.modifiers).contraband === true,
        priceCredits: priceFor(item),
        effects: item.itemDefinition.effects,
        weaponData: item.itemDefinition.weaponData,
        clothingData: item.itemDefinition.clothingData,
        toolData: item.itemDefinition.toolData,
      })),
    };
  }

  async buy(
    buildingId: string,
    itemInstanceId: string,
    characterId: string,
    playerId: string,
  ) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only buy items for your own character');
    }
    if (character.currentBuildingId !== buildingId) {
      throw new BadRequestException('You must be inside the shop to buy items');
    }

    const item = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { itemDefinition: true },
    });
    if (!item) throw new NotFoundException(`Item ${itemInstanceId} not found`);
    if (item.ownerType !== 'BUILDING' || item.ownerId !== buildingId) {
      throw new BadRequestException('Item is not for sale at this building');
    }

    const price = priceFor(item);
    if (character.credits < price) {
      throw new BadRequestException(`Insufficient credits: need ${price}, have ${character.credits}`);
    }

    const district = character.currentDistrictId
      ? await this.prisma.district.findUnique({ where: { id: character.currentDistrictId } })
      : null;
    const isContraband = readModifiers(item.modifiers).contraband === true;
    const wantedDelta = isContraband && district && district.lawLevel >= 6 ? 1 : 0;

    await this.prisma.$transaction([
      this.prisma.character.update({
        where: { id: characterId },
        data: {
          credits: character.credits - price,
          wantedLevel: character.wantedLevel + wantedDelta,
        },
      }),
      this.prisma.itemInstance.update({
        where: { id: item.id },
        data: { ownerType: 'CHARACTER', ownerId: characterId },
      }),
      this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId,
          type: 'ITEM_BOUGHT',
          message: `${character.name} bought ${item.itemDefinition.name} for ${price} credits`,
          relatedEntities: {
            buildingId,
            itemId: item.id,
            itemName: item.itemDefinition.name,
            price,
            wantedDelta,
            contraband: isContraband,
          },
        },
      }),
    ]);

    return {
      success: true,
      item: {
        id: item.id,
        name: item.itemDefinition.name,
        category: item.itemDefinition.category,
        rarity: item.itemDefinition.rarity,
      },
      price,
      wantedDelta,
      newCredits: character.credits - price,
    };
  }

  async sell(
    buildingId: string,
    itemInstanceId: string,
    characterId: string,
    playerId: string,
  ) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only sell your own items');
    }
    if (character.currentBuildingId !== buildingId) {
      throw new BadRequestException('You must be inside the shop to sell items');
    }

    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException(`Building ${buildingId} not found`);
    const fnArr = Array.isArray(building.functionality) ? (building.functionality as string[]) : [];
    const isShop = fnArr.some((f) => SHOP_FUNCTIONS.includes(f));
    if (!isShop) throw new BadRequestException(`${building.name} is not a shop`);

    const item = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { itemDefinition: true },
    });
    if (!item) throw new NotFoundException(`Item ${itemInstanceId} not found`);
    if (item.ownerType !== 'CHARACTER' || item.ownerId !== characterId) {
      throw new BadRequestException('You do not own this item');
    }
    if (item.itemDefinition.category === 'QUEST_ITEM') {
      throw new BadRequestException('Quest items cannot be sold');
    }
    if (item.equippedSlot) {
      throw new BadRequestException(
        `${item.itemDefinition.name} is equipped — unequip it before selling`,
      );
    }

    const baseSellPrice = Math.max(
      1,
      Math.round(item.itemDefinition.baseValue * 0.55 * (item.condition / 100)),
    );
    const isBlackMarket = fnArr.includes('BLACK_MARKET');
    const isContraband = readModifiers(item.modifiers).contraband === true;
    const sellPrice =
      isBlackMarket && isContraband ? Math.round(baseSellPrice * 1.4) : baseSellPrice;

    await this.prisma.$transaction([
      this.prisma.character.update({
        where: { id: characterId },
        data: { credits: character.credits + sellPrice },
      }),
      this.prisma.itemInstance.update({
        where: { id: item.id },
        data: { ownerType: 'BUILDING', ownerId: buildingId },
      }),
      this.prisma.activityLog.create({
        data: {
          playerId: character.playerId,
          characterId,
          type: 'ITEM_SOLD',
          message: `${character.name} sold ${item.itemDefinition.name} for ${sellPrice} credits`,
          relatedEntities: {
            buildingId,
            itemId: item.id,
            itemName: item.itemDefinition.name,
            price: sellPrice,
            blackMarketBonus: isBlackMarket && isContraband,
          },
        },
      }),
    ]);

    return {
      success: true,
      item: {
        id: item.id,
        name: item.itemDefinition.name,
      },
      price: sellPrice,
      newCredits: character.credits + sellPrice,
    };
  }
}
