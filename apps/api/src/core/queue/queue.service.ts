import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const QUEUE_NAMES = {
  EMAIL: 'email',
  IMAGE: 'image',
  SEO: 'seo',
  WEBHOOK: 'webhook',
  CLEANUP: 'cleanup',
  TRACKING: 'tracking',
} as const;

@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly connection: Redis;
  readonly email: Queue;
  readonly image: Queue;
  readonly seo: Queue;
  readonly webhook: Queue;
  readonly cleanup: Queue;
  readonly tracking: Queue;

  constructor(config: ConfigService) {
    this.connection = new Redis(config.getOrThrow<string>('VALKEY_URL'), {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,    // Required by BullMQ
    });

    const conn: ConnectionOptions = this.connection;

    this.email    = new Queue(QUEUE_NAMES.EMAIL,    { connection: conn });
    this.image    = new Queue(QUEUE_NAMES.IMAGE,    { connection: conn });
    this.seo      = new Queue(QUEUE_NAMES.SEO,      { connection: conn });
    this.webhook  = new Queue(QUEUE_NAMES.WEBHOOK,  { connection: conn });
    this.cleanup  = new Queue(QUEUE_NAMES.CLEANUP,  { connection: conn });
    this.tracking = new Queue(QUEUE_NAMES.TRACKING, { connection: conn });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.email.close(),
      this.image.close(),
      this.seo.close(),
      this.webhook.close(),
      this.cleanup.close(),
      this.tracking.close(),
    ]);
    this.connection.disconnect();
  }
}