import 'reflect-metadata';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { SecurityConfig, BODY_SIZE_LIMIT } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Enable rawBody for webhook HMAC signature verification
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const security = app.get(SecurityConfig);
  const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';
  const port = config.getOrThrow<number>('PORT');

  // Logger
  app.useLogger(app.get(Logger));

  // Trust proxy — required for correct IP extraction behind Nginx/Cloudflare
  app.set('trust proxy', 'loopback');

  // Explicit request body size limit (defence against request body flooding)
  app.use(json({ limit: BODY_SIZE_LIMIT }));
  app.use(urlencoded({ limit: BODY_SIZE_LIMIT, extended: true }));

  // Security headers — all policy decisions live in SecurityConfig.helmetOptions
  app.use(helmet(security.helmetOptions));

  // Cookie parser — required by csrf-csrf
  app.use(cookieParser());

  // API versioning
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger (non-production only)
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SneakerEco API')
      .setDescription('SneakerEco multi-tenant platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
}

bootstrap();
