import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantCognitoConfig } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

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

type CognitoConfigRow = typeof tenantCognitoConfig.$inferSelect;

@Injectable()
export class TenantCognitoConfigRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<TenantCognitoConfigRecord, 'id'>): Promise<TenantCognitoConfigRecord> {
    const id = generateId('tenantCognitoConfig');
    const [row] = await this.database.db
      .insert(tenantCognitoConfig)
      .values({
        id,
        tenantId: record.tenantId,
        userPoolId: record.userPoolId,
        userPoolArn: record.userPoolArn,
        userPoolName: record.userPoolName,
        customerClientId: record.customerClientId,
        customerClientName: record.customerClientName,
        region: record.region,
        provisioningStatus: record.provisioningStatus,
        provisioningFailedAt: record.provisioningFailedAt
          ? new Date(record.provisioningFailedAt)
          : null,
        provisioningFailureReason: record.provisioningFailureReason ?? null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async updateByTenantId(
    tenantId: string,
    patch: Partial<TenantCognitoConfigRecord>,
  ): Promise<TenantCognitoConfigRecord | null> {
    const dbPatch: Partial<typeof tenantCognitoConfig.$inferInsert> = {
      ...patch,
      provisioningFailedAt: patch.provisioningFailedAt
        ? new Date(patch.provisioningFailedAt)
        : undefined,
    };
    const [row] = await this.database.db
      .update(tenantCognitoConfig)
      .set(dbPatch)
      .where(eq(tenantCognitoConfig.tenantId, tenantId))
      .returning();
    return row ? this.toRecord(row) : null;
  }

  async findByTenantId(tenantId: string): Promise<TenantCognitoConfigRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.tenantId, tenantId))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: CognitoConfigRow): TenantCognitoConfigRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userPoolId: row.userPoolId,
      userPoolArn: row.userPoolArn,
      userPoolName: row.userPoolName,
      customerClientId: row.customerClientId,
      customerClientName: row.customerClientName,
      region: row.region,
      provisioningStatus: row.provisioningStatus,
      provisioningFailedAt: row.provisioningFailedAt?.toISOString(),
      provisioningFailureReason: row.provisioningFailureReason ?? undefined,
    };
  }
}
