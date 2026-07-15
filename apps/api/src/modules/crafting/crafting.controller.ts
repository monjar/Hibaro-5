import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { CraftingService } from './crafting.service';

@ApiTags('crafting')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('crafting')
export class CraftingController {
  constructor(private readonly craftingService: CraftingService) {}

  @Get('recipes/:characterId')
  @ApiOperation({ summary: 'Crafting recipes annotated with craftability for your character' })
  listRecipes(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.craftingService.listRecipes(characterId, player.sub);
  }

  @Post('craft')
  @ApiOperation({ summary: 'Craft a recipe at a workshop (warehouse or your rented safehouse)' })
  craft(
    @CurrentPlayer() player: AuthenticatedPlayer,
    @Body() body: { characterId: string; recipeId: string },
  ) {
    return this.craftingService.craft(
      String(body?.characterId ?? ''),
      player.sub,
      String(body?.recipeId ?? ''),
    );
  }
}
