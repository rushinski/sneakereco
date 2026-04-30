import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { generateId } from '@sneakereco/shared';

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

@Injectable()
export class TenantSetupInvitationsRepository {
  private readonly records = new Map<string, TenantSetupInvitationRecord>();

  async issue(input: { tenantId: string; adminUserId: string; rawToken: string; expiresAt: string }) {
    const created: TenantSetupInvitationRecord = {
      id: generateId('tenantSetupInvitation'),
      tenantId: input.tenantId,
      adminUserId: input.adminUserId,
      tokenHash: this.hash(input.rawToken),
      status: 'issued',
      sentAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    this.records.set(created.id, created);
    return created;
  }

  async consume(rawToken: string) {
    const tokenHash = this.hash(rawToken);
    const record = [...this.records.values()].find((entry) => entry.tokenHash === tokenHash) ?? null;
    if (!record) {
      return null;
    }

    if (record.status !== 'issued' || new Date(record.expiresAt) <= new Date()) {
      return null;
    }

    record.status = 'consumed';
    record.consumedAt = new Date().toISOString();
    this.records.set(record.id, record);
    return record;
  }

  async findByTenantId(tenantId: string) {
    return [...this.records.values()].find((record) => record.tenantId === tenantId) ?? null;
  }

  private hash(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}