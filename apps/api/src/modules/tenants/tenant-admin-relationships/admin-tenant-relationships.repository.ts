import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

export interface AdminTenantRelationshipRecord {
  id: string;
  adminUserId: string;
  tenantId: string;
  relationshipType: 'tenant_admin';
  status: 'active' | 'revoked';
}

@Injectable()
export class AdminTenantRelationshipsRepository {
  private readonly records = new Map<string, AdminTenantRelationshipRecord>();

  async create(record: Omit<AdminTenantRelationshipRecord, 'id'>) {
    const created: AdminTenantRelationshipRecord = {
      id: generateId('adminTenantRelationship'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async findActiveByAdminUserId(adminUserId: string) {
    return (
      [...this.records.values()].find(
        (record) => record.adminUserId === adminUserId && record.status === 'active',
      ) ?? null
    );
  }

  async findActiveByTenantId(tenantId: string) {
    return (
      [...this.records.values()].find(
        (record) => record.tenantId === tenantId && record.status === 'active',
      ) ?? null
    );
  }
}
