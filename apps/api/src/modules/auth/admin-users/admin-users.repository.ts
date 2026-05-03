import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { adminUsers } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName?: string;
  cognitoSub: string;
  adminType: 'platform_admin' | 'tenant_scoped_admin';
  status: 'pending_setup' | 'active' | 'suspended' | 'disabled';
  lastLoginAt?: string;
}

type AdminUserRow = typeof adminUsers.$inferSelect;

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<AdminUserRecord, 'id'>): Promise<AdminUserRecord> {
    const id = generateId('adminUser');
    const [row] = await this.database.db
      .insert(adminUsers)
      .values({
        id,
        email: record.email,
        fullName: record.fullName ?? null,
        cognitoSub: record.cognitoSub,
        adminType: record.adminType,
        status: record.status,
        lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt) : null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async findByEmail(email: string): Promise<AdminUserRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<AdminUserRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findByCognitoSub(cognitoSub: string): Promise<AdminUserRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.cognitoSub, cognitoSub))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async markActive(id: string): Promise<void> {
    await this.database.db
      .update(adminUsers)
      .set({ status: 'active', lastLoginAt: new Date() })
      .where(eq(adminUsers.id, id));
  }

  private toRecord(row: AdminUserRow): AdminUserRecord {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName ?? undefined,
      cognitoSub: row.cognitoSub,
      adminType: row.adminType,
      status: row.status,
      lastLoginAt: row.lastLoginAt?.toISOString(),
    };
  }
}
