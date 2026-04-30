import { Global, Module } from '@nestjs/common';

import { LoggerService } from './logging/logger.service';

@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class ObservabilityModule {}