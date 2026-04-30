import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_TOKEN');

    if (!expected || expected.trim() === '') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      (request.headers['x-admin-token'] as string | undefined) ??
      this.extractBearer(request.headers.authorization);

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Admin token required');
    }
    return true;
  }

  private extractBearer(header: string | undefined): string | undefined {
    if (!header) return undefined;
    if (!header.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim() || undefined;
  }
}
