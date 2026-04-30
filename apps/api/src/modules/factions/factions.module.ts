import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FactionsController } from './factions.controller';
import { FactionsService } from './factions.service';

@Module({
  imports: [AuthModule],
  controllers: [FactionsController],
  providers: [FactionsService],
})
export class FactionsModule {}
