import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser | false): TUser {
    if (err || !user) {
      throw err instanceof Error
        ? err
        : new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
