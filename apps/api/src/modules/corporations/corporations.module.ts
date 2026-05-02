import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CorporationsController } from './corporations.controller';
import { CorporationsService } from './corporations.service';

@Module({
  imports: [AuthModule],
  controllers: [CorporationsController],
  providers: [CorporationsService],
})
export class CorporationsModule {}
