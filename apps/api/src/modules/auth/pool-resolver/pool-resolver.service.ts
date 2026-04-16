import { Injectable, NotFoundException } from '@nestjs/common';

import type { TenantScopedRole } from '../auth.types';
import type { PoolCredentials } from '../cognito/cognito.types';
import { PoolResolverRepository } from './pool-resolver.repository';

@Injectable()
export class PoolResolverService {
  constructor(private readonly repository: PoolResolverRepository) {}

  async resolveTenantPool(
    tenantId: string,
    role: TenantScopedRole,
  ): Promise<PoolCredentials> {
    const config = await this.repository.findByTenantId(tenantId);

    if (!config) {
      throw new NotFoundException('Tenant authentication is not configured');
    }

    return {
      userPoolId: config.userPoolId,
      clientId: role === 'admin' ? config.adminClientId : config.customerClientId,
    };
  }
}
