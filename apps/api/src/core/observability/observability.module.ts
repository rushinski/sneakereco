import { Global, Module, forwardRef } from '@nestjs/common';

import { SecurityModule } from '../security/security.module';
import { LoggerService } from './logging/logger.service';
import { RequestContextService } from './logging/request-context.service';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';

@Global()
@Module({
  imports: [forwardRef(() => SecurityModule)],
  controllers: [MetricsController],
  providers: [LoggerService, RequestContextService, MetricsService],
  exports: [LoggerService, RequestContextService, MetricsService],
})
export class ObservabilityModule {}