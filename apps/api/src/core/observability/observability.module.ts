import { Global, Module } from '@nestjs/common';

import { LoggerService } from './logging/logger.service';
import { RequestContextService } from './logging/request-context.service';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [LoggerService, RequestContextService, MetricsService],
  exports: [LoggerService, RequestContextService, MetricsService],
})
export class ObservabilityModule {}