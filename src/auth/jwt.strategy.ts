import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import * as fs from 'fs';
import { Role } from '../types/role.enum';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  avatar?: string;
  roles: Role[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly cls: ClsService,
  ) {
    const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');
    const publicKey = fs.readFileSync(publicKeyPath);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['ES256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      avatar: payload.avatar,
      roles: payload.roles ?? [],
    };

    this.cls.set('user', user);
    return user;
  }
}
