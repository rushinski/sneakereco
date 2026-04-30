import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface TenantApplicationRecord {
  id: string;
  requestedByName: string;
  requestedByEmail: string;
  businessName: string;
  instagramHandle?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'withdrawn';
  reviewedByAdminUserId?: string;
  reviewedAt?: string;
  denialReason?: string;
  approvedTenantId?: string;
}

@Injectable()
export class TenantApplicationsRepository {
  private readonly records = new Map<string, TenantApplicationRecord>();

  async create(record: Omit<TenantApplicationRecord, 'id'>) {
    const created: TenantApplicationRecord = {
      id: generateId('tenantApplication'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async update(id: string, patch: Partial<TenantApplicationRecord>) {
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
}