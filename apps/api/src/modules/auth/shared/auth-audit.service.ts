import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../core/observability/logging/logger.service';

@Injectable()
export class AuthAuditService {
  constructor(private readonly logger: LoggerService) {}

  record(eventName: string, metadata: Record<string, unknown>) {
    this.logger.log(`Auth event: ${eventName}`, {
      eventName,
      metadata,
    });
  }
}