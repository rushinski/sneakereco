import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { customerUsers } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

export interface CustomerUserRecord {
  id: string;
  tenantId: string;
  email: string;
  fullName?: string;
  cognitoSub: string;
  status: 'active' | 'suspended' | 'disabled';
  lastLoginAt?: string;
}

type CustomerUserRow = typeof customerUsers.$inferSelect;

@Injectable()
export class CustomerUsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<CustomerUserRecord, 'id'>): Promise<CustomerUserRecord> {
    const id = generateId('customerUser');
    const [row] = await this.database.db
      .insert(customerUsers)
      .values({
        id,
        tenantId: record.tenantId,
        email: record.email,
        fullName: record.fullName ?? null,
        cognitoSub: record.cognitoSub,
        status: record.status,
        lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt) : null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async findByTenantAndEmail(tenantId: string, email: string): Promise<CustomerUserRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(customerUsers)
      .where(and(eq(customerUsers.tenantId, tenantId), eq(customerUsers.email, email)))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findByTenantAndCognitoSub(
    tenantId: string,
    cognitoSub: string,
  ): Promise<CustomerUserRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(customerUsers)
      .where(
        and(eq(customerUsers.tenantId, tenantId), eq(customerUsers.cognitoSub, cognitoSub)),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.database.db
      .update(customerUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(customerUsers.id, id));
  }

  private toRecord(row: CustomerUserRow): CustomerUserRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      fullName: row.fullName ?? undefined,
      cognitoSub: row.cognitoSub,
      status: row.status,
      lastLoginAt: row.lastLoginAt?.toISOString(),
    };
  }
}
