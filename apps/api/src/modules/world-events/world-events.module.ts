import { Module } from '@nestjs/common';
import { WorldEventsController } from './world-events.controller';
import { WorldEventsService } from './world-events.service';

@Module({
  controllers: [WorldEventsController],
  providers: [WorldEventsService],
  exports: [WorldEventsService],
})
export class WorldEventsModule {}
