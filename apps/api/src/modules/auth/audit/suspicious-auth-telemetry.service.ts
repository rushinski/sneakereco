import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../core/observability/logging/logger.service';
import { MetricsService } from '../../../core/observability/metrics/metrics.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class SuspiciousAuthTelemetryService {
  constructor(
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService,
    private readonly auditService: AuditService,
  ) {}

  record(signal: string, metadata: Record<string, unknown>) {
    this.metricsService.increment('auth.suspicious_signals');
    void this.auditService.record({
      eventName: `auth.suspicious.${signal}`,
      tenantId: typeof metadata.tenantId === 'string' ? metadata.tenantId : undefined,
      actorType: typeof metadata.actorType === 'string' ? metadata.actorType : undefined,
      actorId: typeof metadata.actorId === 'string' ? metadata.actorId : undefined,
      metadata,
    });
    this.logger.warn(`Suspicious auth signal: ${signal}`, {
      eventName: `auth.suspicious.${signal}`,
      metadata,
    });
  }
}