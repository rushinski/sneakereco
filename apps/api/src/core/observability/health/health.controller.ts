import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';

import { CacheService } from '../../cache/cache.service';
import { DatabaseService } from '../../database/database.service';
import { SentEmailRepository } from '../../email/sent-email.repository';
import { OutboxRepository } from '../../events/outbox.repository';
import { MetricsService } from '../metrics/metrics.service';
import { QueueService } from '../../queue/queue.service';
import { WorkerHeartbeatService } from './worker-heartbeat.service';
import { SecurityService } from '../../security/security.service';

@Controller('health')
export class HealthController {
    constructor(
      private readonly databaseService: DatabaseService,
      private readonly cacheService: CacheService,
      private readonly queueService: QueueService,
      private readonly workerHeartbeatService: WorkerHeartbeatService,
      private readonly outboxRepository: OutboxRepository,
      private readonly sentEmailRepository: SentEmailRepository,
      private readonly metricsService: MetricsService,
      private readonly securityService: SecurityService,
    ) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
    };
  }

  @Get('ready')
  async getReadiness(@Headers('x-ops-token') opsToken?: string) {
    if (!this.securityService.hasValidOpsToken(opsToken)) {
      throw new UnauthorizedException('Missing or invalid ops token');
    }

    await this.databaseService.appPool.query('select 1');
    const cacheStatus = await this.cacheService.ping();
    const queueStatus = await this.queueService.ping();
    const pending = await this.outboxRepository.listPending();
    const failed = await this.outboxRepository.listFailed();
    const sentEmails = await this.sentEmailRepository.list();

    this.metricsService.setGauge('outbox.pending', pending.length);
    this.metricsService.setGauge('outbox.failed', failed.length);
    this.metricsService.setGauge('email.sent_total', sentEmails.length);

    return {
      status: 'ok',
      checks: {
        database: 'ok',
        cache: cacheStatus,
        queue: queueStatus,
        worker: await this.workerHeartbeatService.getStatus(),
      },
      backlogs: {
        outboxPending: pending.length,
        outboxFailed: failed.length,
        sentEmails: sentEmails.length,
      },
      metrics: this.metricsService.snapshot(),
    };
  }
}