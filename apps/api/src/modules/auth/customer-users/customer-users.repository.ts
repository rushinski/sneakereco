import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface CustomerUserRecord {
  id: string;
  tenantId: string;
  email: string;
  fullName?: string;
  cognitoSub: string;
  status: 'active' | 'suspended' | 'disabled';
  lastLoginAt?: string;
}

@Injectable()
export class CustomerUsersRepository {
  private readonly records = new Map<string, CustomerUserRecord>();

  async create(record: Omit<CustomerUserRecord, 'id'>) {
    const created: CustomerUserRecord = {
      id: generateId('customerUser'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async findByTenantAndEmail(tenantId: string, email: string) {
    return (
      [...this.records.values()].find(
        (record) => record.tenantId === tenantId && record.email === email,
      ) ?? null
    );
  }

  async findByTenantAndCognitoSub(tenantId: string, cognitoSub: string) {
    return (
      [...this.records.values()].find(
        (record) => record.tenantId === tenantId && record.cognitoSub === cognitoSub,
      ) ?? null
    );
  }

  async touchLastLogin(id: string) {
    const record = this.records.get(id);
    if (record) {
      record.lastLoginAt = new Date().toISOString();
      this.records.set(id, record);
    }
  }
}