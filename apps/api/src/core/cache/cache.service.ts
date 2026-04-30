import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import type { Env } from '../config';
import { ENVIRONMENT } from '../config/config.module';

@Injectable()
export class CacheService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(ENVIRONMENT) env: Env) {
    this.client = new Redis(env.VALKEY_URL, {
      keyPrefix: `${env.QUEUE_PREFIX}:cache:`,
      lazyConnect: true,
    });
  }

  async ping() {
    return this.client.ping();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}