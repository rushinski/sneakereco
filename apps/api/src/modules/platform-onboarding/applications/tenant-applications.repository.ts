import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantApplications } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

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

type TenantApplicationRow = typeof tenantApplications.$inferSelect;

@Injectable()
export class TenantApplicationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<TenantApplicationRecord, 'id'>): Promise<TenantApplicationRecord> {
    const id = generateId('tenantApplication');
    const [row] = await this.database.db
      .insert(tenantApplications)
      .values({
        id,
        requestedByName: record.requestedByName,
        requestedByEmail: record.requestedByEmail,
        businessName: record.businessName,
        instagramHandle: record.instagramHandle ?? null,
        status: record.status,
        reviewedByAdminUserId: record.reviewedByAdminUserId ?? null,
        reviewedAt: record.reviewedAt ? new Date(record.reviewedAt) : null,
        denialReason: record.denialReason ?? null,
        approvedTenantId: record.approvedTenantId ?? null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async update(
    id: string,
    patch: Partial<TenantApplicationRecord>,
  ): Promise<TenantApplicationRecord | null> {
    const dbPatch: Partial<typeof tenantApplications.$inferInsert> = {
      ...patch,
      reviewedAt: patch.reviewedAt ? new Date(patch.reviewedAt) : undefined,
    };
    const [row] = await this.database.db
      .update(tenantApplications)
      .set(dbPatch)
      .where(eq(tenantApplications.id, id))
      .returning();
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<TenantApplicationRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantApplications)
      .where(eq(tenantApplications.id, id))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: TenantApplicationRow): TenantApplicationRecord {
    return {
      id: row.id,
      requestedByName: row.requestedByName,
      requestedByEmail: row.requestedByEmail,
      businessName: row.businessName,
      instagramHandle: row.instagramHandle ?? undefined,
      status: row.status,
      reviewedByAdminUserId: row.reviewedByAdminUserId ?? undefined,
      reviewedAt: row.reviewedAt?.toISOString(),
      denialReason: row.denialReason ?? undefined,
      approvedTenantId: row.approvedTenantId ?? undefined,
    };
  }
}
