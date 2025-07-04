import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { ClsModule } from 'nestjs-cls';
import { ulid } from 'ulid';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().required(),
      }),
    }),
    ClsModule.forRoot({
      middleware: {
        mount: true,
        setup: (cls, req, res) => {
          const requestId = ulid();
          cls.set('x-request-id', requestId);
          res.setHeader('X-Request-ID', requestId);
        },
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 6000,
        limit: 10,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
