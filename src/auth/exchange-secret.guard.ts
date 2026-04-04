import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class ExchangeSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedSecret = this.configService.get<string>(
      'AUTH_EXCHANGE_SECRET',
    );
    const providedSecret = request.header('x-auth-exchange-secret');

    if (!expectedSecret || !providedSecret) {
      throw new UnauthorizedException('Invalid auth exchange secret');
    }

    const expected = Buffer.from(expectedSecret, 'utf8');
    const provided = Buffer.from(providedSecret, 'utf8');

    if (expected.length !== provided.length) {
      throw new UnauthorizedException('Invalid auth exchange secret');
    }

    if (!timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException('Invalid auth exchange secret');
    }

    return true;
  }
}
