import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { adminTenantRelationships } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

export interface AdminTenantRelationshipRecord {
  id: string;
  adminUserId: string;
  tenantId: string;
  relationshipType: 'tenant_admin';
  status: 'active' | 'revoked';
}

type RelationshipRow = typeof adminTenantRelationships.$inferSelect;

@Injectable()
export class AdminTenantRelationshipsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(
    record: Omit<AdminTenantRelationshipRecord, 'id'>,
  ): Promise<AdminTenantRelationshipRecord> {
    const id = generateId('adminTenantRelationship');
    const [row] = await this.database.db
      .insert(adminTenantRelationships)
      .values({
        id,
        adminUserId: record.adminUserId,
        tenantId: record.tenantId,
        relationshipType: record.relationshipType,
        status: record.status,
      })
      .returning();
    return this.toRecord(row!);
  }

  async findActiveByAdminUserId(
    adminUserId: string,
  ): Promise<AdminTenantRelationshipRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(adminTenantRelationships)
      .where(
        and(
          eq(adminTenantRelationships.adminUserId, adminUserId),
          eq(adminTenantRelationships.status, 'active'),
        ),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findActiveByTenantId(tenantId: string): Promise<AdminTenantRelationshipRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(adminTenantRelationships)
      .where(
        and(
          eq(adminTenantRelationships.tenantId, tenantId),
          eq(adminTenantRelationships.status, 'active'),
        ),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: RelationshipRow): AdminTenantRelationshipRecord {
    return {
      id: row.id,
      adminUserId: row.adminUserId,
      tenantId: row.tenantId,
      relationshipType: row.relationshipType,
      status: row.status as 'active' | 'revoked',
    };
  }
}
