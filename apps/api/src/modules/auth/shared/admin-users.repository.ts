import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName?: string;
  cognitoSub: string;
  adminType: 'platform_admin' | 'tenant_scoped_admin';
  status: 'pending_setup' | 'active' | 'suspended' | 'disabled';
  lastLoginAt?: string;
}

@Injectable()
export class AdminUsersRepository {
  private readonly records = new Map<string, AdminUserRecord>();

  async create(record: Omit<AdminUserRecord, 'id'>) {
    const created: AdminUserRecord = {
      id: generateId('adminUser'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async findByEmail(email: string) {
    return [...this.records.values()].find((record) => record.email === email) ?? null;
  }

  async findByCognitoSub(cognitoSub: string) {
    return [...this.records.values()].find((record) => record.cognitoSub === cognitoSub) ?? null;
  }

  async markActive(id: string) {
    const record = this.records.get(id);
    if (record) {
      record.status = 'active';
      record.lastLoginAt = new Date().toISOString();
      this.records.set(id, record);
    }
  }
}