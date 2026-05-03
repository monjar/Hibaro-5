import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedPlayer } from './auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authenticated = await this.authenticateAdmin(request);
    if (authenticated) {
      return true;
    }

    const expected = this.config.get<string>('ADMIN_TOKEN');

    if (!expected || expected.trim() === '') {
      throw new UnauthorizedException('Admin access required');
    }

    const provided =
      (request.headers['x-admin-token'] as string | undefined) ??
      this.extractBearer(request.headers.authorization);

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Admin access required');
    }
    return true;
  }

  private async authenticateAdmin(request: Request) {
    const bearer = this.extractBearer(request.headers.authorization);
    if (!bearer) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedPlayer>(bearer);
      const player = await this.prisma.player.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, isAdmin: true },
      });
      if (!player?.isAdmin) {
        throw new UnauthorizedException('Admin access required');
      }
      (request as Request & { user?: AuthenticatedPlayer }).user = {
        sub: player.id,
        username: player.username,
        isAdmin: true,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return false;
    }
  }

  private extractBearer(header: string | undefined): string | undefined {
    if (!header) return undefined;
    if (!header.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim() || undefined;
  }
}
