import { Injectable } from '@nestjs/common';

import type { DomainEvent, PersistedDomainEvent } from './domain-event.types';

@Injectable()
export class OutboxRepository {
  private readonly events = new Map<string, PersistedDomainEvent>();

  async persist(event: DomainEvent) {
    const persisted: PersistedDomainEvent = {
      ...event,
      status: 'pending',
    };
    this.events.set(persisted.id, persisted);
    return persisted;
  }
  
  async listPending() {
    return [...this.events.values()].filter((event) => event.status === 'pending');
  }

  async listFailed() {
    return [...this.events.values()].filter((event) => event.status === 'failed');
  }

  async markDispatched(id: string) {
    const event = this.events.get(id);
    if (!event) {
      return null;
    }

    event.status = 'dispatched';
    this.events.set(id, event);
    return event;
  }

  async markFailed(id: string, failureReason: string) {
    const event = this.events.get(id);
    if (!event) {
      return null;
    }

    event.status = 'failed';
    event.failureReason = failureReason;
    this.events.set(id, event);
    return event;
  }

  async requeueFailed(id: string) {
    const event = this.events.get(id);
    if (!event || event.status !== 'failed') {
      return null;
    }

    event.status = 'pending';
    delete event.failureReason;
    this.events.set(id, event);
    return event;
  }
}