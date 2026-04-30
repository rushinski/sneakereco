import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../core/observability/logging/logger.service';
import { MetricsService } from '../../../core/observability/metrics/metrics.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuthAuditService {
  constructor(
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService,
    private readonly auditService: AuditService,
  ) {}

  record(eventName: string, metadata: Record<string, unknown>) {
    if (eventName.includes('failed')) {
      this.metricsService.increment('auth.failures');
    }

    void this.auditService.record({
      eventName,
      tenantId: typeof metadata.tenantId === 'string' ? metadata.tenantId : undefined,
      actorType:
        typeof metadata.actorType === 'string'
          ? metadata.actorType
          : eventName.includes('tenant.')
            ? 'platform_admin'
            : undefined,
      actorId:
        typeof metadata.adminUserId === 'string'
          ? metadata.adminUserId
          : typeof metadata.reviewedByAdminUserId === 'string'
            ? metadata.reviewedByAdminUserId
            : undefined,
      metadata,
    });

    this.logger.log(`Auth event: ${eventName}`, {
      eventName,
      metadata,
    });
  }
}