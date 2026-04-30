import { Injectable } from '@nestjs/common';

import type { DomainEvent } from './domain-event.types';

@Injectable()
export class OutboxRepository {
  async persist(event: DomainEvent) {
    return {
      persisted: true,
      event,
    };
  }
}