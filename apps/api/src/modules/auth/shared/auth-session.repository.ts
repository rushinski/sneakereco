import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { ActorType } from './auth.types';

export interface AuthSessionRecord {
  id: string;
  actorType: ActorType;
  adminUserId?: string;
  customerUserId?: string;
  tenantId?: string;
  userPoolId: string;
  appClientId: string;
  cognitoSub: string;
  deviceId: string;
  sessionVersion: string;
  refreshTokenFingerprint: string;
  originJti: string;
  status: 'active' | 'revoked' | 'expired' | 'replaced';
  issuedAt: string;
  expiresAt: string;
  lastSeenAt?: string;
  lastRefreshAt?: string;
  ipAddress?: string;
  userAgent?: string;
  revokedAt?: string;
  revocationReason?: string;
}

@Injectable()
export class AuthSessionRepository {
  private readonly records = new Map<string, AuthSessionRecord>();

  async create(record: Omit<AuthSessionRecord, 'id'>) {
    const created: AuthSessionRecord = {
      id: generateId('authSession'),
      ...record,
    };
    this.records.set(created.id, created);
    return created;
  }

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async findActiveBySubject(cognitoSub: string, userPoolId: string) {
    return [...this.records.values()].filter(
      (record) =>
        record.cognitoSub === cognitoSub &&
        record.userPoolId === userPoolId &&
        record.status === 'active',
    );
  }

  async revokeBySubject(cognitoSub: string, userPoolId: string, reason: string) {
    const now = new Date().toISOString();
    for (const record of this.records.values()) {
      if (record.cognitoSub === cognitoSub && record.userPoolId === userPoolId) {
        record.status = 'revoked';
        record.revokedAt = now;
        record.revocationReason = reason;
        this.records.set(record.id, record);
      }
    }
  }

  async revokeById(id: string, reason: string) {
    const record = this.records.get(id);
    if (!record) {
      return;
    }

    record.status = 'revoked';
    record.revokedAt = new Date().toISOString();
    record.revocationReason = reason;
    this.records.set(id, record);
  }

  async touchRefresh(id: string) {
    const record = this.records.get(id);
    if (record) {
      record.lastRefreshAt = new Date().toISOString();
      this.records.set(id, record);
    }
  }
}