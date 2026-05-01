import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../core/observability/logging/logger.service';
import { MetricsService } from '../../../core/observability/metrics/metrics.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class EmailAuditService {
  constructor(
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService,
    private readonly auditService: AuditService,
  ) {}

  record(eventName: string, metadata: Record<string, unknown>) {
    if (eventName.includes('failed')) {
      this.metricsService.increment('email.failures');
    }

    void this.auditService.record({
      eventName,
      tenantId: typeof metadata.tenantId === 'string' ? metadata.tenantId : undefined,
      actorType: typeof metadata.actorType === 'string' ? metadata.actorType : undefined,
      actorId:
        typeof metadata.actorAdminUserId === 'string'
          ? metadata.actorAdminUserId
          : undefined,
      metadata,
    });

    this.logger.log(`Email event: ${eventName}`, {
      eventName,
      metadata,
    });
  }
}
