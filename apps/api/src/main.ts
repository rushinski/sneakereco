import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';

import { HttpAppModule } from './http-app.module';
import { envSchema } from './core/config';
import { LoggerService } from './core/observability/logging/logger.service';
import { RequestContextService } from './core/observability/logging/request-context.service';
import { createCorsOriginValidator } from './core/security/cors-origin-policy';
import { SecurityService } from './core/security/security.service';
import { TrustedHostService } from './core/security/trusted-host.service';
import { TenantDomainConfigRepository } from './modules/tenants/tenant-domain/domain-config.repository';

async function bootstrap() {
  const env = envSchema.parse(process.env);

  const app = await NestFactory.create<NestFastifyApplication>(
    HttpAppModule,
    new FastifyAdapter({ logger: false }),
  );
  const securityService = app.get(SecurityService);
  const trustedHostService = app.get(TrustedHostService);
  const requestContextService = app.get(RequestContextService);
  const logger = app.get(LoggerService);
  const tenantDomainConfigRepository = app.get(TenantDomainConfigRepository);

  app.useLogger(logger);

  await app.register(fastifyHelmet, securityService.getHelmetOptions());
  await app.register(fastifyCookie);
  await app.register(fastifyCors, {
    ...securityService.getCorsOptions(),
    origin: createCorsOriginValidator(
      trustedHostService,
      async (host) => (await tenantDomainConfigRepository.findByCustomDomain(host)) !== null,
    ),
  });

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', async (request, reply) => {
    const requestIdHeader = env.REQUEST_ID_HEADER;
    const correlationIdHeader = env.CORRELATION_ID_HEADER;
    const requestId = request.headers[requestIdHeader] ?? randomUUID();
    const correlationId = request.headers[correlationIdHeader] ?? requestId;

    requestContextService.enter({
      requestId: String(requestId),
      correlationId: String(correlationId),
    });

    request.headers[requestIdHeader] = String(requestId);
    request.headers[correlationIdHeader] = String(correlationId);
    reply.header(requestIdHeader, String(requestId));
    reply.header(correlationIdHeader, String(correlationId));
  });

  if (env.SWAGGER_ENABLED) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('SneakerEco API')
        .setDescription('Internal API for the SneakerEco platform and tenant-web BFFs')
        .setVersion('0.1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'cognito-jwt')
        .addApiKey({ type: 'apiKey', in: 'header', name: 'x-ops-token' }, 'ops-token')
        .addTag('auth', 'Authentication flows')
        .addTag('tenants', 'Tenant management')
        .addTag('platform-admins', 'Platform admin management')
        .addTag('communications', 'Email delivery')
        .addTag('web-builder', 'Storefront builder')
        .build(),
    );
    SwaggerModule.setup(env.SWAGGER_PATH, app, document);
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.log('HTTP runtime started', {
    eventName: 'runtime.http.started',
    metadata: {
      port: env.PORT,
      swaggerEnabled: env.SWAGGER_ENABLED,
    },
  });
}

void bootstrap();
