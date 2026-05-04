import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

@Injectable()
export class ReleaseHistoryRepository {
  private readonly events = new Map<string, {
    id: string;
    tenantId: string;
    releaseSetId: string;
    eventType: 'published' | 'scheduled' | 'rolled_back' | 'archived';
    actorAdminUserId?: string;
    summary?: string;
  }>();

  async record(input: Omit<(typeof this.events extends Map<string, infer T> ? T : never), 'id'>) {
    const event = { id: generateId('tenantReleaseHistory'), ...input };
    this.events.set(event.id, event);
    return event;
  }

  async listByReleaseSetId(releaseSetId: string) {
    return [...this.events.values()].filter((event) => event.releaseSetId === releaseSetId);
  }
}