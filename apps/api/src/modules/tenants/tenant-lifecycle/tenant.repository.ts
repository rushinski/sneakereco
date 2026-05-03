import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

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

type TenantRow = typeof tenants.$inferSelect;

@Injectable()
export class TenantRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<TenantRecord, 'id'>): Promise<TenantRecord> {
    const id = generateId('tenant');
    const [row] = await this.database.db
      .insert(tenants)
      .values({
        id,
        name: record.name,
        slug: record.slug,
        email: record.email,
        status: record.status,
        provisioningFailedAt: record.provisioningFailedAt
          ? new Date(record.provisioningFailedAt)
          : null,
        provisioningFailureReason: record.provisioningFailureReason ?? null,
        setupCompletedAt: record.setupCompletedAt ? new Date(record.setupCompletedAt) : null,
        launchedAt: record.launchedAt ? new Date(record.launchedAt) : null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async update(id: string, patch: Partial<TenantRecord>): Promise<TenantRecord | null> {
    const dbPatch: Partial<typeof tenants.$inferInsert> = {
      ...patch,
      provisioningFailedAt: patch.provisioningFailedAt
        ? new Date(patch.provisioningFailedAt)
        : undefined,
      setupCompletedAt: patch.setupCompletedAt ? new Date(patch.setupCompletedAt) : undefined,
      launchedAt: patch.launchedAt ? new Date(patch.launchedAt) : undefined,
    };
    const [row] = await this.database.db
      .update(tenants)
      .set(dbPatch)
      .where(eq(tenants.id, id))
      .returning();
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<TenantRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: TenantRow): TenantRecord {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      status: row.status,
      provisioningFailedAt: row.provisioningFailedAt?.toISOString(),
      provisioningFailureReason: row.provisioningFailureReason ?? undefined,
      setupCompletedAt: row.setupCompletedAt?.toISOString(),
      launchedAt: row.launchedAt?.toISOString(),
    };
  }
}
