import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  email: string;
  status:
    | 'provisioning'
    | 'setup_pending'
    | 'active'
    | 'suspended'
    | 'deactivated'
    | 'provisioning_failed';
  provisioningFailedAt?: string;
  provisioningFailureReason?: string;
  setupCompletedAt?: string;
  launchedAt?: string;
}

@Injectable()
export class TenantRepository {
  private readonly records = new Map<string, TenantRecord>();

  async create(record: Omit<TenantRecord, 'id'>) {
    const created: TenantRecord = {
      id: generateId('tenant'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async update(id: string, patch: Partial<TenantRecord>) {
    const record = this.records.get(id);
    if (!record) {
      return null;
    }

    const updated = { ...record, ...patch };
    this.records.set(id, updated);
    return updated;
  }

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    return [...this.records.values()].find((record) => record.slug === slug) ?? null;
  }
}