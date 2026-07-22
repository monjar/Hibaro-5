import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PvpController } from './pvp.controller';
import { PvpService } from './pvp.service';

@Module({
  imports: [AuthModule],
  controllers: [PvpController],
  providers: [PvpService],
  exports: [PvpService],
})
export class PvpModule {}
