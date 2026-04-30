import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { ReleaseSetRecord } from './web-builder.types';

@Injectable()
export class ReleaseSetsRepository {
  private readonly records = new Map<string, ReleaseSetRecord>();

  async create(input: Omit<ReleaseSetRecord, 'id' | 'status'>) {
    const record: ReleaseSetRecord = {
      id: generateId('tenantReleaseSet'),
      status: 'draft',
      ...input,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async findPublishedByTenant(tenantId: string) {
    return [...this.records.values()].find((record) => record.tenantId === tenantId && record.status === 'published') ?? null;
  }

  async update(id: string, patch: Partial<ReleaseSetRecord>) {
    const record = this.records.get(id);
    if (!record) return null;
    const updated = { ...record, ...patch };
    this.records.set(id, updated);
    return updated;
  }

  async archivePublishedForTenant(tenantId: string) {
    for (const record of this.records.values()) {
      if (record.tenantId === tenantId && record.status === 'published') {
        record.status = 'archived';
        this.records.set(record.id, record);
      }
    }
  }
}