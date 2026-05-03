import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { authSessions } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';
import type { ActorType } from '../principals/auth.types';

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

type AuthSessionRow = typeof authSessions.$inferSelect;

@Injectable()
export class AuthSessionRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(record: Omit<AuthSessionRecord, 'id'>): Promise<AuthSessionRecord> {
    const id = generateId('authSession');
    const [row] = await this.database.db
      .insert(authSessions)
      .values({
        id,
        actorType: record.actorType,
        adminUserId: record.adminUserId ?? null,
        customerUserId: record.customerUserId ?? null,
        tenantId: record.tenantId ?? null,
        userPoolId: record.userPoolId,
        appClientId: record.appClientId,
        cognitoSub: record.cognitoSub,
        deviceId: record.deviceId,
        sessionVersion: record.sessionVersion,
        refreshTokenFingerprint: record.refreshTokenFingerprint,
        originJti: record.originJti,
        status: record.status,
        issuedAt: new Date(record.issuedAt),
        expiresAt: new Date(record.expiresAt),
        lastSeenAt: record.lastSeenAt ? new Date(record.lastSeenAt) : null,
        lastRefreshAt: record.lastRefreshAt ? new Date(record.lastRefreshAt) : null,
        ipAddress: record.ipAddress ?? null,
        userAgent: record.userAgent ?? null,
        revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
        revocationReason: record.revocationReason ?? null,
      })
      .returning();
    return this.toRecord(row!);
  }

  async findById(id: string): Promise<AuthSessionRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, id))
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  async findActiveBySubject(
    cognitoSub: string,
    userPoolId: string,
  ): Promise<AuthSessionRecord[]> {
    const rows = await this.database.db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.cognitoSub, cognitoSub),
          eq(authSessions.userPoolId, userPoolId),
          eq(authSessions.status, 'active'),
        ),
      );
    return rows.map((row) => this.toRecord(row));
  }

  async revokeBySubject(
    cognitoSub: string,
    userPoolId: string,
    reason: string,
  ): Promise<void> {
    await this.database.db
      .update(authSessions)
      .set({ status: 'revoked', revokedAt: new Date(), revocationReason: reason })
      .where(
        and(
          eq(authSessions.cognitoSub, cognitoSub),
          eq(authSessions.userPoolId, userPoolId),
        ),
      );
  }

  async revokeById(id: string, reason: string): Promise<void> {
    await this.database.db
      .update(authSessions)
      .set({ status: 'revoked', revokedAt: new Date(), revocationReason: reason })
      .where(eq(authSessions.id, id));
  }

  async touchRefresh(id: string): Promise<void> {
    await this.database.db
      .update(authSessions)
      .set({ lastRefreshAt: new Date() })
      .where(eq(authSessions.id, id));
  }

  private toRecord(row: AuthSessionRow): AuthSessionRecord {
    return {
      id: row.id,
      actorType: row.actorType as ActorType,
      adminUserId: row.adminUserId ?? undefined,
      customerUserId: row.customerUserId ?? undefined,
      tenantId: row.tenantId ?? undefined,
      userPoolId: row.userPoolId,
      appClientId: row.appClientId,
      cognitoSub: row.cognitoSub,
      deviceId: row.deviceId,
      sessionVersion: row.sessionVersion,
      refreshTokenFingerprint: row.refreshTokenFingerprint,
      originJti: row.originJti,
      status: row.status,
      issuedAt: row.issuedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      lastSeenAt: row.lastSeenAt?.toISOString(),
      lastRefreshAt: row.lastRefreshAt?.toISOString(),
      ipAddress: row.ipAddress ?? undefined,
      userAgent: row.userAgent ?? undefined,
      revokedAt: row.revokedAt?.toISOString(),
      revocationReason: row.revocationReason ?? undefined,
    };
  }
}
