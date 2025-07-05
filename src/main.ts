import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { useRequestLogging } from './utils/request-logging';
import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { CustomExceptionFilter } from './utils/exception-filter';
import helmet from 'helmet';
import * as compression from 'compression';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    rawBody: true,
    bodyParser: true,
  });
  useRequestLogging(app);
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        }));
        return new BadRequestException(messages);
      },
    }),
  );

  app.useGlobalFilters(new CustomExceptionFilter());

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Boilerplate')
    .setDescription(' Boilerplate')
    .setVersion('1.0')
    .addTag('Boilerplate')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);
  app.enableCors();

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(9000);
}
bootstrap();
