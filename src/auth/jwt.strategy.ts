import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import * as fs from 'fs';

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

  async validate(payload: any) {
    this.cls.set('user', { id: payload.sub });
    return { id: payload.sub, email: payload.email };
  }
} 