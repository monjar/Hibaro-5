import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPlayer } from './auth.service';

export const CurrentPlayer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPlayer => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedPlayer }>();
    return request.user;
  },
);
