import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorldEventsController } from './world-events.controller';
import { WorldEventsService } from './world-events.service';

@Module({
  imports: [AuthModule],
  controllers: [WorldEventsController],
  providers: [WorldEventsService],
  exports: [WorldEventsService],
})
export class WorldEventsModule {}
