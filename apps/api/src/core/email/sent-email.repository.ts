import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import { CacheService } from '../cache/cache.service';
import type { SentEmailRecord, SendEmailInput } from './email.types';

@Injectable()
export class SentEmailRepository {
  private readonly records = new Map<string, SentEmailRecord>();

  constructor(private readonly cacheService: CacheService) {}

  async recordDelivery(
    input: SendEmailInput & {
      transport: 'smtp' | 'ses';
    },
  ) {
    const record: SentEmailRecord = {
      id: generateId('emailLog'),
      deliveredAt: new Date().toISOString(),
      ...input,
    };

    if (process.env.NODE_ENV === 'test') {
      this.records.set(record.id, record);
      return record;
    }

    await this.cacheService.client
      .multi()
      .hset('sent-email:records', record.id, JSON.stringify(record))
      .rpush('sent-email:ids', record.id)
      .exec();
    
    return record;
  }

  async list() {
    if (process.env.NODE_ENV === 'test') {
      return [...this.records.values()];
    }

    const ids = await this.cacheService.client.lrange('sent-email:ids', 0, -1);
    if (ids.length === 0) {
      return [];
    }

    const records = await this.cacheService.client.hmget('sent-email:records', ...ids);
    return records.flatMap((record) => (record ? [JSON.parse(record) as SentEmailRecord] : []));
  }

  async latest() {
    if (process.env.NODE_ENV === 'test') {
      return [...this.records.values()].at(-1) ?? null;
    }

    const id = await this.cacheService.client.lindex('sent-email:ids', -1);
    if (!id) {
      return null;
    }

    const record = await this.cacheService.client.hget('sent-email:records', id);
    return record ? (JSON.parse(record) as SentEmailRecord) : null;
  }
}