import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedPlayer } from '../auth/auth.service';
import { CurrentPlayer } from '../auth/current-player.decorator';
import { JobsService } from './jobs.service';

class HireDto {
  @IsString()
  @IsUUID()
  characterId!: string;
}

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get('employments/:characterId')
  @ApiOperation({ summary: 'List all job employments for a character' })
  list(
    @Param('characterId') characterId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.jobs.listForCharacter(characterId, player.sub);
  }

  @Post(':opportunityId/hire')
  @ApiOperation({ summary: 'Get hired for a JOB-kind opportunity' })
  hire(
    @Param('opportunityId') opportunityId: string,
    @Body() dto: HireDto,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.jobs.hire(opportunityId, dto.characterId, player.sub);
  }

  @Post('employments/:employmentId/quit')
  @ApiOperation({ summary: 'Quit a job (sets status to QUIT, no penalties)' })
  quit(
    @Param('employmentId') employmentId: string,
    @CurrentPlayer() player: AuthenticatedPlayer,
  ) {
    return this.jobs.quit(employmentId, player.sub);
  }
}
