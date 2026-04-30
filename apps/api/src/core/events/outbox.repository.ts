import { Injectable } from '@nestjs/common';

import { QueueService } from '../queue/queue.service';
import type { DomainEvent, PersistedDomainEvent } from './domain-event.types';

@Injectable()
export class OutboxRepository {
  private readonly events = new Map<string, PersistedDomainEvent>();

  constructor(private readonly queueService: QueueService) {}

  async persist(event: DomainEvent) {
    const persisted: PersistedDomainEvent = {
      ...event,
      status: 'pending',
    };

    if (process.env.NODE_ENV === 'test') {
      this.events.set(persisted.id, persisted);
      return persisted;
    }

    await this.queueService.client
      .multi()
      .hset('outbox:events', persisted.id, JSON.stringify(persisted))
      .sadd('outbox:pending', persisted.id)
      .srem('outbox:failed', persisted.id)
      .exec();

    return persisted;
  }
  
  async listPending() {
    if (process.env.NODE_ENV === 'test') {
      return [...this.events.values()].filter((event) => event.status === 'pending');
    }

    const ids = await this.queueService.client.smembers('outbox:pending');
    if (ids.length === 0) {
      return [];
    }

    const records = await this.queueService.client.hmget('outbox:events', ...ids);
    return records.flatMap((record) =>
      record ? [JSON.parse(record) as PersistedDomainEvent] : [],
    );
  }

  async listFailed() {
    if (process.env.NODE_ENV === 'test') {
      return [...this.events.values()].filter((event) => event.status === 'failed');
    }

    const ids = await this.queueService.client.smembers('outbox:failed');
    if (ids.length === 0) {
      return [];
    }

    const records = await this.queueService.client.hmget('outbox:events', ...ids);
    return records.flatMap((record) =>
      record ? [JSON.parse(record) as PersistedDomainEvent] : [],
    );
  }

  async markDispatched(id: string) {
    const event = await this.findById(id);
    if (!event) {
      return null;
    }

    event.status = 'dispatched';
    
    if (process.env.NODE_ENV === 'test') {
      this.events.set(id, event);
      return event;
    }

    await this.queueService.client
      .multi()
      .hset('outbox:events', id, JSON.stringify(event))
      .srem('outbox:pending', id)
      .srem('outbox:failed', id)
      .exec();

    return event;
  }

  async markFailed(id: string, failureReason: string) {
    const event = await this.findById(id);
    if (!event) {
      return null;
    }

    event.status = 'failed';
    event.failureReason = failureReason;
    
    if (process.env.NODE_ENV === 'test') {
      this.events.set(id, event);
      return event;
    }

    await this.queueService.client
      .multi()
      .hset('outbox:events', id, JSON.stringify(event))
      .srem('outbox:pending', id)
      .sadd('outbox:failed', id)
      .exec();

    return event;
  }

  async requeueFailed(id: string) {
    const event = await this.findById(id);
    if (!event || event.status !== 'failed') {
      return null;
    }

    event.status = 'pending';
    delete event.failureReason;
    
    if (process.env.NODE_ENV === 'test') {
      this.events.set(id, event);
      return event;
    }

    await this.queueService.client
      .multi()
      .hset('outbox:events', id, JSON.stringify(event))
      .sadd('outbox:pending', id)
      .srem('outbox:failed', id)
      .exec();

    return event;
  }

  private async findById(id: string) {
    if (process.env.NODE_ENV === 'test') {
      return this.events.get(id) ?? null;
    }

    const record = await this.queueService.client.hget('outbox:events', id);
    return record ? (JSON.parse(record) as PersistedDomainEvent) : null;
  }
}