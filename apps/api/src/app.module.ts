import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PlayersModule } from './modules/players/players.module';
import { CharactersModule } from './modules/characters/characters.module';
import { LocationsModule } from './modules/locations/locations.module';
import { FactionsModule } from './modules/factions/factions.module';
import { CorporationsModule } from './modules/corporations/corporations.module';
import { ItemsModule } from './modules/items/items.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { WorldEventsModule } from './modules/world-events/world-events.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PlayersModule,
    CharactersModule,
    LocationsModule,
    FactionsModule,
    CorporationsModule,
    ItemsModule,
    OpportunitiesModule,
    SimulationModule,
    WorldEventsModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
