import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantCognitoConfig } from '@sneakereco/db';

import { DatabaseService } from '../../../core/database/database.service';

@Injectable()
export class PoolResolverRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByTenantId(tenantId: string) {
    const [config] = await this.db.systemDb
      .select({
        userPoolId: tenantCognitoConfig.userPoolId,
        customerClientId: tenantCognitoConfig.customerClientId,
        adminClientId: tenantCognitoConfig.adminClientId,
      })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.tenantId, tenantId))
      .limit(1);

    return config;
  }

  async findByPoolId(poolId: string) {
    const [config] = await this.db.systemDb
      .select({
        userPoolId: tenantCognitoConfig.userPoolId,
        customerClientId: tenantCognitoConfig.customerClientId,
        adminClientId: tenantCognitoConfig.adminClientId,
      })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.userPoolId, poolId))
      .limit(1);

    return config;
  }
}
