import { Controller, Get } from '@nestjs/common';

import { CacheService } from '../../cache/cache.service';
import { DatabaseService } from '../../database/database.service';
import { QueueService } from '../../queue/queue.service';
import { WorkerHeartbeatService } from './worker-heartbeat.service';

@Controller('health')
export class HealthController {
    constructor(
      private readonly databaseService: DatabaseService,
      private readonly cacheService: CacheService,
      private readonly queueService: QueueService,
      private readonly workerHeartbeatService: WorkerHeartbeatService,
    ) {}

  @Get()
  async getHealth() {
    await this.databaseService.appPool.query('select 1');
    const cacheStatus = await this.cacheService.ping();
    const queueStatus = await this.queueService.ping();

    return {
      status: 'ok',
      checks: {
        database: 'ok',
        cache: cacheStatus,
        queue: queueStatus,
        worker: await this.workerHeartbeatService.getStatus(),
      },
    };
  }
}