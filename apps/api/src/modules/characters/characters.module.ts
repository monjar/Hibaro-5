import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Module({
  imports: [AuthModule, RealtimeModule, OpportunitiesModule],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
