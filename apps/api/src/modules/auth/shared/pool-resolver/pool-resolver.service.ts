import { Injectable, NotFoundException } from '@nestjs/common';

import { ValkeyService } from '../../../../core/valkey/valkey.service';
import type { PoolCredentials } from '../cognito/cognito.types';
import { PoolResolverRepository } from './pool-resolver.repository';

const POOL_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class PoolResolverService {
  constructor(
    private readonly repository: PoolResolverRepository,
    private readonly valkey: ValkeyService,
  ) {}

  async resolveTenantPool(
    tenantId: string,
    role: 'admin' | 'customer',
  ): Promise<PoolCredentials> {
    const cacheKey = `pool:${tenantId}:${role}`;

    const cached = await this.valkey.getJson<PoolCredentials>(cacheKey);
    if (cached) return cached;

    const config = await this.repository.findByTenantId(tenantId);

    if (!config) {
      throw new NotFoundException('Tenant authentication is not configured');
    }

    const credentials: PoolCredentials = {
      userPoolId: config.userPoolId,
      clientId: role === 'admin' ? config.adminClientId : config.customerClientId,
    };

    await this.valkey.setJson(cacheKey, credentials, POOL_CACHE_TTL);

    return credentials;
  }

  async invalidatePoolCache(tenantId: string): Promise<void> {
    await this.valkey.del(`pool:${tenantId}:admin`, `pool:${tenantId}:customer`);
  }
}
