import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantCognitoConfig, tenantMembers, users } from '@sneakereco/db';
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
}
