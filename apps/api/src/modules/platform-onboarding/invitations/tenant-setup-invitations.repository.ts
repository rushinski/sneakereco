import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { tenantSetupInvitations } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

export interface TenantSetupInvitationRecord {
  id: string;
  tenantId: string;
  adminUserId: string;
  tokenHash: string;
  status: 'issued' | 'consumed' | 'expired' | 'revoked';
  sentAt?: string;
  expiresAt: string;
  consumedAt?: string;
  revokedAt?: string;
}

type InvitationRow = typeof tenantSetupInvitations.$inferSelect;

@Injectable()
export class TenantSetupInvitationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async issue(input: {
    tenantId: string;
    adminUserId: string;
    rawToken: string;
    expiresAt: string;
  }): Promise<TenantSetupInvitationRecord> {
    const id = generateId('tenantSetupInvitation');
    const [row] = await this.database.db
      .insert(tenantSetupInvitations)
      .values({
        id,
        tenantId: input.tenantId,
        adminUserId: input.adminUserId,
        tokenHash: this.hash(input.rawToken),
        status: 'issued',
        sentAt: new Date(),
        expiresAt: new Date(input.expiresAt),
      })
      .returning();
    return this.toRecord(row!);
  }

  async consume(rawToken: string): Promise<TenantSetupInvitationRecord | null> {
    const tokenHash = this.hash(rawToken);
    const [existing] = await this.database.db
      .select()
      .from(tenantSetupInvitations)
      .where(
        and(
          eq(tenantSetupInvitations.tokenHash, tokenHash),
          eq(tenantSetupInvitations.status, 'issued'),
          gt(tenantSetupInvitations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!existing) return null;

    const [updated] = await this.database.db
      .update(tenantSetupInvitations)
      .set({ status: 'consumed', consumedAt: new Date() })
      .where(eq(tenantSetupInvitations.id, existing.id))
      .returning();
    return updated ? this.toRecord(updated) : null;
  }

  async findByTenantId(tenantId: string): Promise<TenantSetupInvitationRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(tenantSetupInvitations)
      .where(eq(tenantSetupInvitations.tenantId, tenantId))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toRecord(row: InvitationRow): TenantSetupInvitationRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      adminUserId: row.adminUserId,
      tokenHash: row.tokenHash,
      status: row.status,
      sentAt: row.sentAt?.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      consumedAt: row.consumedAt?.toISOString(),
      revokedAt: row.revokedAt?.toISOString(),
    };
  }
}
