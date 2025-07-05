import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import * as fs from 'fs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from 'src/users/users.module';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const privateKeyPath = configService.get<string>('JWT_PRIVATE_KEY_PATH');
        const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');
        const privateKey = fs.readFileSync(privateKeyPath);
        const publicKey = fs.readFileSync(publicKeyPath);

        return {
          privateKey,
          publicKey,
          signOptions: { expiresIn: '60m', algorithm: 'ES256' },
        };
      },
    }),
    UsersModule,
    ClsModule
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {} 