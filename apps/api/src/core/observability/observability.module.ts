import { Global, Module } from '@nestjs/common';

import { LoggerService } from './logging/logger.service';
import { RequestContextService } from './logging/request-context.service';

@Global()
@Module({
  providers: [LoggerService, RequestContextService],
  exports: [LoggerService, RequestContextService],
})
export class ObservabilityModule {}