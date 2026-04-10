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
import { initCsrf } from './common/middleware/csrf/csrf.config';
import { OriginResolverService } from './common/services/origin-resolver.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Enable rawBody for webhook HMAC signature verification
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const originResolver = app.get(OriginResolverService);
  const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';
  const port = config.getOrThrow<number>('PORT');

  // CORS — allow platform, dashboard, and any known tenant origin
  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser requests (curl, server-to-server) have no Origin header
      if (!origin) return callback(null, true);

      originResolver
        .classifyOrigin(origin)
        .then((group) => {
          if (group === 'unknown') {
            callback(new Error(`CORS: origin not allowed — ${origin}`));
          } else {
            callback(null, true);
          }
        })
        .catch(() => callback(new Error('CORS: origin check failed')));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Tenant-ID'],
  });

  // Logger
  app.useLogger(app.get(Logger));

  // Trust proxy — required for correct IP extraction behind Nginx/Cloudflare
  app.set('trust proxy', 'loopback');

  // Explicit request body size limit (defence against request body flooding)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  // Security headers via helmet — custom CSP allows PayRilla, NoFraud, and R2 CDN
  const r2PublicUrl = config.get<string>('R2_PUBLIC_URL');
  const awsRegion = config.getOrThrow<string>('AWS_REGION');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'tokenization.payrillagateway.com', 'services.nofraud.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', ...(r2PublicUrl ? [r2PublicUrl] : [])],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          connectSrc: [
            "'self'",
            'tokenization.payrillagateway.com',
            'services.nofraud.com',
            `https://cognito-idp.${awsRegion}.amazonaws.com`,
          ],
          frameSrc: ['tokenization.payrillagateway.com'],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      // crossOriginEmbedderPolicy breaks the PayRilla tokenization iframe
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // required for R2 CDN assets
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // X-XSS-Protection is deprecated — CSP replaces it. Setting it to 1;mode=block
      // can introduce vulnerabilities in older browsers; suppress it entirely.
      xXssProtection: false,
    }),
  );

  // Cookie parser — required by csrf-csrf
  app.use(cookieParser());

  // Initialise csrf-csrf so generateCsrfToken and doubleCsrfProtection are
  // available to CsrfGuard and the CSRF token controller.
  const csrfSecret = config.getOrThrow<string>('CSRF_SECRET');
  initCsrf(csrfSecret, isProduction);
  // doubleCsrfProtection is no longer applied globally here.
  // It is applied selectively via CsrfGuard on cookie-authenticated routes only
  // (currently: POST /v1/auth/refresh). Bearer-token routes and webhooks are
  // excluded from CSRF checks — they are not cookie-based.

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