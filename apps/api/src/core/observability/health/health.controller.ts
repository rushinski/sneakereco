import { Controller, Get } from '@nestjs/common';

import { CacheService } from '../../cache/cache.service';
import { DatabaseService } from '../../database/database.service';
import { QueueService } from '../../queue/queue.service';

@Controller('health')
export class HealthController {
    constructor(
      private readonly databaseService: DatabaseService,
      private readonly cacheService: CacheService,
      private readonly queueService: QueueService,
    ) {}

  @Get()
  async getHealth() {
    await this.databaseService.appPool.query('select 1');
    const cacheStatus = await this.cacheService.client.ping();
    const queueStatus = await this.queueService.client.ping();

    return {
      status: 'ok',
      checks: {
        database: 'ok',
        cache: cacheStatus,
        queue: queueStatus,
      },
    };
  }
}