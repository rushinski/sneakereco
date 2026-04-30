import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface TenantBusinessProfileRecord {
  id: string;
  tenantId: string;
  businessName: string;
  contactEmail: string;
  instagramHandle?: string;
}

@Injectable()
export class TenantBusinessProfileRepository {
  private readonly records = new Map<string, TenantBusinessProfileRecord>();

  async create(record: Omit<TenantBusinessProfileRecord, 'id'>) {
    const created: TenantBusinessProfileRecord = {
      id: generateId('tenantBusinessProfile'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async findByTenantId(tenantId: string) {
    return [...this.records.values()].find((record) => record.tenantId === tenantId) ?? null;
  }
}