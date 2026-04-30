import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';

import type { Env } from '../../config';
import { ENVIRONMENT } from '../../config/config.module';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class WorkerHeartbeatService implements OnModuleDestroy {
  private readonly heartbeatKey: string;
  private readonly heartbeatTtlSeconds: number;
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly cacheService: CacheService,
    @Inject(ENVIRONMENT) env: Env,
  ) {
    this.heartbeatKey = `${env.QUEUE_PREFIX}:worker:heartbeat`;
    this.heartbeatTtlSeconds = 30;
  }

  start() {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      void this.markAlive();
    }, 10_000);
  }

  async markAlive() {
    await this.cacheService.client.set(
      this.heartbeatKey,
      new Date().toISOString(),
      'EX',
      this.heartbeatTtlSeconds,
    );
  }

  async getStatus() {
    const lastHeartbeatAt = await this.cacheService.client.get(this.heartbeatKey);

    return {
      status: lastHeartbeatAt ? 'ok' : 'missing',
      lastHeartbeatAt,
    };
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}