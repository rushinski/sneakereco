import { NestFactory } from '@nestjs/core';

import { WorkerAppModule } from './worker-app.module';
import { LoggerService } from './core/observability/logging/logger.service';
import { WorkerHeartbeatService } from './core/observability/health/worker-heartbeat.service';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const heartbeatService = app.get(WorkerHeartbeatService);
  const logger = app.get(LoggerService);

  app.enableShutdownHooks();
  await heartbeatService.markAlive();
  heartbeatService.start();
  logger.log('Worker runtime started', {
    eventName: 'runtime.worker.started',
  });
}

void bootstrapWorker();