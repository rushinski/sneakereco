import { Injectable } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import {
  authSessionLineageRevocations,
  authSubjectRevocations,
  tenantCognitoConfig,
  tenantMembers,
  users,
} from '@sneakereco/db';
import type { TenantMemberRole } from '@sneakereco/db';

import { DatabaseService } from '../../../../core/database/database.service';

@Injectable()
export class JwtStrategyRepository {
  constructor(private readonly db: DatabaseService) {}

  async findPoolByPoolId(poolId: string) {
    const [config] = await this.db.systemDb
      .select({
        userPoolId: tenantCognitoConfig.userPoolId,
        customerClientId: tenantCognitoConfig.customerClientId,
      })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.userPoolId, poolId))
      .limit(1);

    return config;
  }

  async findMembershipByCognitoSub(sub: string): Promise<{
    tenantId: string;
    role: TenantMemberRole;
    memberId: string;
  } | null> {
    const [row] = await this.db.systemDb
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        memberId: tenantMembers.id,
      })
      .from(users)
      .innerJoin(tenantMembers, eq(tenantMembers.userId, users.id))
      .where(eq(users.cognitoSub, sub))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      tenantId: row.tenantId,
      role: row.role as TenantMemberRole,
      memberId: row.memberId,
    };
  }

  async findMembershipByCognitoSubAndTenant(
    sub: string,
    tenantId: string,
  ): Promise<{
    tenantId: string;
    role: TenantMemberRole;
    memberId: string;
  } | null> {
    const [row] = await this.db.systemDb
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        memberId: tenantMembers.id,
      })
      .from(users)
      .innerJoin(tenantMembers, eq(tenantMembers.userId, users.id))
      .where(and(eq(users.cognitoSub, sub), eq(tenantMembers.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      tenantId: row.tenantId,
      role: row.role as TenantMemberRole,
      memberId: row.memberId,
    };
  }

  async findSubjectRevocation(cognitoSub: string, userPoolId: string): Promise<Date | null> {
    const [row] = await this.db.systemDb
      .select({ revokeBefore: authSubjectRevocations.revokeBefore })
      .from(authSubjectRevocations)
      .where(
        and(
          eq(authSubjectRevocations.cognitoSub, cognitoSub),
          eq(authSubjectRevocations.userPoolId, userPoolId),
        ),
      )
      .limit(1);

    return row?.revokeBefore ?? null;
  }

  async hasLineageRevocation(input: {
    cognitoSub: string;
    userPoolId: string;
    originJti: string;
    surfaceKey: string;
  }): Promise<boolean> {
    const [row] = await this.db.systemDb
      .select({ id: authSessionLineageRevocations.id })
      .from(authSessionLineageRevocations)
      .where(
        and(
          eq(authSessionLineageRevocations.cognitoSub, input.cognitoSub),
          eq(authSessionLineageRevocations.userPoolId, input.userPoolId),
          eq(authSessionLineageRevocations.originJti, input.originJti),
          eq(authSessionLineageRevocations.surfaceKey, input.surfaceKey),
          gt(authSessionLineageRevocations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return Boolean(row);
  }
}
