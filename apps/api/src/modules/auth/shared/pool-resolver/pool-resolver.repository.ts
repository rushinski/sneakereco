import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { tenantCognitoConfig, tenantMembers, users } from '@sneakereco/db';

import { DatabaseService } from '../../../../core/database/database.service';

@Injectable()
export class PoolResolverRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByTenantId(tenantId: string) {
    const [config] = await this.db.systemDb
      .select({
        userPoolId: tenantCognitoConfig.userPoolId,
        customerClientId: tenantCognitoConfig.customerClientId,
      })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.tenantId, tenantId))
      .limit(1);

    return config;
  }

  async hasAdminMembership(tenantId: string, email: string): Promise<boolean> {
    const [member] = await this.db.systemDb
      .select({ id: tenantMembers.id })
      .from(users)
      .innerJoin(tenantMembers, eq(tenantMembers.userId, users.id))
      .where(
        and(
          eq(users.email, email),
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.role, 'admin'),
        ),
      )
      .limit(1);

    return Boolean(member);
  }
}
