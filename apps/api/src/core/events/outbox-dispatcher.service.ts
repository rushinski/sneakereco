import { Injectable } from '@nestjs/common';

import type { DomainEvent } from './domain-event.types';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxDispatcherService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async enqueue(event: DomainEvent) {
    return this.outboxRepository.persist(event);
  }
}