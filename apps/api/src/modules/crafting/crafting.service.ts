import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CRAFTING_RECIPES,
  CharacterStats,
  aggregateEquipmentBonuses,
  applyEquipmentBonuses,
  applyXpGain,
  evaluateCraft,
} from '@heliora/game-rules';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CraftingService {
  constructor(private prisma: PrismaService) {}

  private toStats(character: any): CharacterStats {
    return {
      id: character.id,
      name: character.name,
      credits: character.credits ?? 0,
      health: character.health ?? 0,
      maxHealth: character.maxHealth ?? 100,
      energy: character.energy ?? 0,
      maxEnergy: character.maxEnergy ?? 100,
      wantedLevel: character.wantedLevel ?? 0,
      strength: character.strength ?? 0,
      agility: character.agility ?? 0,
      intelligence: character.intelligence ?? 0,
      charisma: character.charisma ?? 0,
      hacking: character.hacking ?? 0,
      combat: character.combat ?? 0,
      stealth: character.stealth ?? 0,
      engineering: character.engineering ?? 0,
      reputation: character.reputation ?? 0,
      level: character.level ?? 1,
    };
  }

  private async buildContext(characterId: string, playerId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { currentBuilding: true },
    });
    if (!character) throw new NotFoundException(`Character ${characterId} not found`);
    if (character.playerId !== playerId) {
      throw new ForbiddenException('You can only craft with your own character');
    }

    const [inventory, equipped, housing] = await Promise.all([
      this.prisma.itemInstance.findMany({
        where: { ownerType: 'CHARACTER', ownerId: characterId, equippedSlot: null },
        include: { itemDefinition: { select: { name: true } } },
      }),
      this.prisma.itemInstance.findMany({
        where: { ownerType: 'CHARACTER', ownerId: characterId, equippedSlot: { not: null } },
        include: { itemDefinition: true },
      }),
      this.prisma.characterHousing.findFirst({
        where: { characterId, status: 'ACTIVE' },
        select: { buildingId: true },
      }),
    ]);

    const functionality = Array.isArray(character.currentBuilding?.functionality)
      ? (character.currentBuilding?.functionality as string[])
      : [];
    const atWorkshop =
      functionality.includes('WAREHOUSE') ||
      Boolean(housing && character.currentBuildingId === housing.buildingId);

    const materialCounts: Record<string, number> = {};
    for (const item of inventory) {
      const name = item.itemDefinition.name;
      materialCounts[name] = (materialCounts[name] ?? 0) + 1;
    }

    const stats = applyEquipmentBonuses(
      this.toStats(character),
      aggregateEquipmentBonuses(equipped.map((item) => item.itemDefinition).filter(Boolean)),
    );

    return { character, inventory, materialCounts, atWorkshop, stats };
  }

  /** Recipes annotated with whether this character can craft them right now. */
  async listRecipes(characterId: string, playerId: string) {
    const context = await this.buildContext(characterId, playerId);
    return {
      atWorkshop: context.atWorkshop,
      recipes: CRAFTING_RECIPES.map((recipe) => {
        const evaluation = evaluateCraft(recipe, {
          credits: context.character.credits,
          energy: context.character.energy,
          stats: context.stats,
          materialCounts: context.materialCounts,
          atWorkshop: context.atWorkshop,
        });
        return { ...recipe, ...evaluation };
      }),
    };
  }

  async craft(characterId: string, playerId: string, recipeId: string) {
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) throw new NotFoundException(`Unknown recipe: ${recipeId}`);

    const context = await this.buildContext(characterId, playerId);
    const evaluation = evaluateCraft(recipe, {
      credits: context.character.credits,
      energy: context.character.energy,
      stats: context.stats,
      materialCounts: context.materialCounts,
      atWorkshop: context.atWorkshop,
    });
    if (!evaluation.canCraft) {
      throw new BadRequestException(evaluation.reasons.join(' · '));
    }

    const outputDefinition = await this.prisma.itemDefinition.findUnique({
      where: { name: recipe.output.itemName },
      select: { id: true, name: true },
    });
    if (!outputDefinition) {
      throw new BadRequestException(
        `Recipe output "${recipe.output.itemName}" is not seeded on this world`,
      );
    }

    // Consume the worst-condition copies first.
    const consumedIds: string[] = [];
    for (const input of recipe.inputs) {
      const candidates = context.inventory
        .filter((item) => item.itemDefinition.name === input.itemName)
        .sort((left, right) => left.condition - right.condition)
        .slice(0, input.quantity);
      consumedIds.push(...candidates.map((item) => item.id));
    }

    const progression = applyXpGain(
      { xp: context.character.xp ?? 0, level: context.character.level ?? 1 },
      recipe.xpReward,
    );
    const characterData: Record<string, number> = {
      credits: Number((context.character.credits - recipe.creditsCost).toFixed(2)),
      energy: Math.max(0, context.character.energy - recipe.energyCost),
      xp: progression.xp,
    };
    if (progression.levelsGained > 0) {
      characterData.level = progression.level;
      characterData.unspentStatPoints =
        (context.character.unspentStatPoints ?? 0) + progression.statPointsGained;
      characterData.maxHealth =
        (context.character.maxHealth ?? 100) + progression.maxHealthGained;
      characterData.maxEnergy =
        (context.character.maxEnergy ?? 100) + progression.maxEnergyGained;
    }

    await this.prisma.$transaction([
      this.prisma.itemInstance.deleteMany({ where: { id: { in: consumedIds } } }),
      this.prisma.character.update({ where: { id: characterId }, data: characterData }),
      this.prisma.itemInstance.createMany({
        data: Array.from({ length: recipe.output.quantity }, () => ({
          itemDefinitionId: outputDefinition.id,
          ownerType: 'CHARACTER' as const,
          ownerId: characterId,
        })),
      }),
      ...(context.character.playerId
        ? [
            this.prisma.activityLog.create({
              data: {
                playerId: context.character.playerId,
                characterId,
                type: 'ITEM_CRAFTED',
                message: `${context.character.name} crafted ${recipe.output.quantity}× ${outputDefinition.name}`,
                relatedEntities: { recipeId, consumed: consumedIds.length },
              },
            }),
          ]
        : []),
    ]);

    return {
      crafted: outputDefinition.name,
      quantity: recipe.output.quantity,
      xpGained: recipe.xpReward,
      levelUp:
        progression.levelsGained > 0
          ? { level: progression.level, statPointsGained: progression.statPointsGained }
          : null,
    };
  }
}
