import 'reflect-metadata';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { SecurityConfig, BODY_SIZE_LIMIT } from './config/security.config';
import { buildCorsOptions } from './config/cors.config';
import { DatabaseService } from './core/database/database.service';
import { CacheService } from './core/cache/cache.service';

function parseBodyLimit(limit: string): number {
  const normalized = limit.trim().toLowerCase();
  if (normalized.endsWith('mb')) {
    return Number.parseInt(normalized.slice(0, -2), 10) * 1024 * 1024;
  }
  if (normalized.endsWith('kb')) {
    return Number.parseInt(normalized.slice(0, -2), 10) * 1024;
  }
  return Number.parseInt(normalized, 10);
}

async function bootstrap() {
  const adapter = new FastifyAdapter({
    bodyLimit: parseBodyLimit(BODY_SIZE_LIMIT),
    trustProxy: 'loopback',
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    // Enable rawBody for webhook HMAC signature verification
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const db = app.get(DatabaseService);
  const security = app.get(SecurityConfig);
  const valkey = app.get(CacheService);
  const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';
  const port = config.getOrThrow<number>('PORT');

  app.useLogger(app.get(Logger));

  // Fastify-native plugins replace the old Express middleware stack.
  await app.register(cookie as any);
  await app.register(cors as any, buildCorsOptions(db, valkey, config));
  await app.register(helmet as any, security.helmetOptions as any);

  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('v1');

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor(), new TransformInterceptor());

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

  await app.listen(port, '0.0.0.0');
}

bootstrap();
