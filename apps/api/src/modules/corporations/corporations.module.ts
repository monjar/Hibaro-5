import { Module } from '@nestjs/common';
import { CorporationsController } from './corporations.controller';
import { CorporationsService } from './corporations.service';

@Module({
  controllers: [CorporationsController],
  providers: [CorporationsService],
})
export class CorporationsModule {}
