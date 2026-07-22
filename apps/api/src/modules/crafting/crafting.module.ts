import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CraftingController } from './crafting.controller';
import { CraftingService } from './crafting.service';

@Module({
  imports: [AuthModule],
  controllers: [CraftingController],
  providers: [CraftingService],
})
export class CraftingModule {}
