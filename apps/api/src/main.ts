import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('SneakerEco API').setVersion('0.1.0').build(),
  );
  SwaggerModule.setup('docs', app, document);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

void bootstrap();