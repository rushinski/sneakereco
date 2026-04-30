import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';

import { AppModule } from './app.module';
import { getDomainConfig, envSchema } from './core/config';

async function bootstrap() {
  const env = envSchema.parse(process.env);
  const domainConfig = getDomainConfig(process.env);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  await app.register(fastifyHelmet);
  await app.register(fastifyCookie);
  await app.register(fastifyCors, {
    origin: [domainConfig.platformUrl, domainConfig.platformDashboardUrl, ...domainConfig.staticAllowedOrigins],
    credentials: true,
  });

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', async (request, reply) => {
    const requestIdHeader = env.REQUEST_ID_HEADER;
    const correlationIdHeader = env.CORRELATION_ID_HEADER;
    const requestId = request.headers[requestIdHeader] ?? randomUUID();
    const correlationId = request.headers[correlationIdHeader] ?? requestId;

    request.headers[requestIdHeader] = String(requestId);
    request.headers[correlationIdHeader] = String(correlationId);
    reply.header(requestIdHeader, String(requestId));
    reply.header(correlationIdHeader, String(correlationId));
  });

  if (env.SWAGGER_ENABLED) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('SneakerEco API').setVersion('0.1.0').build(),
    );
    SwaggerModule.setup(env.SWAGGER_PATH, app, document);
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

void bootstrap();