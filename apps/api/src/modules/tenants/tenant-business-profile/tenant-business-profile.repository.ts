import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantBusinessProfiles } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

export interface TenantBusinessProfileRecord {
  id: string;
  tenantId: string;
  businessName: string;
  contactEmail?: string;
  instagramHandle?: string;
}

type ProfileRow = typeof tenantBusinessProfiles.$inferSelect;

@Injectable()
export class TenantBusinessProfileRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(
    record: Omit<TenantBusinessProfileRecord, 'id'>,
  ): Promise<TenantBusinessProfileRecord> {
    const id = generateId('tenantBusinessProfile');
    const [row] = await this.database.db
      .insert(tenantBusinessProfiles)
      .values({
        id,
        tenantId: record.tenantId,
        businessName: record.businessName,
        contactEmail: record.contactEmail ?? null,
        instagramHandle: record.instagramHandle ?? null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async findByTenantId(tenantId: string): Promise<TenantBusinessProfileRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantBusinessProfiles)
      .where(eq(tenantBusinessProfiles.tenantId, tenantId))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: ProfileRow): TenantBusinessProfileRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      businessName: row.businessName,
      contactEmail: row.contactEmail ?? undefined,
      instagramHandle: row.instagramHandle ?? undefined,
    };
  }
}
