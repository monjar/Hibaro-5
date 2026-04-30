import { Module } from '@nestjs/common';
import { FactionsController } from './factions.controller';
import { FactionsService } from './factions.service';

@Module({
  controllers: [FactionsController],
  providers: [FactionsService],
})
export class FactionsModule {}
