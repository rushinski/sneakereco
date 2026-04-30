import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface TenantCognitoConfigRecord {
  id: string;
  tenantId: string;
  userPoolId: string;
  userPoolArn: string;
  userPoolName: string;
  customerClientId: string;
  customerClientName: string;
  region: string;
  provisioningStatus: 'pending' | 'ready' | 'failed';
  provisioningFailedAt?: string;
  provisioningFailureReason?: string;
}

@Injectable()
export class TenantCognitoConfigRepository {
  private readonly records = new Map<string, TenantCognitoConfigRecord>();

  async create(record: Omit<TenantCognitoConfigRecord, 'id'>) {
    const created: TenantCognitoConfigRecord = {
      id: generateId('tenantCognitoConfig'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async updateByTenantId(tenantId: string, patch: Partial<TenantCognitoConfigRecord>) {
    const record = await this.findByTenantId(tenantId);
    if (!record) {
      return null;
    }

    const updated = { ...record, ...patch };
    this.records.set(updated.id, updated);
    return updated;
  }

  async findByTenantId(tenantId: string) {
    return [...this.records.values()].find((record) => record.tenantId === tenantId) ?? null;
  }
}