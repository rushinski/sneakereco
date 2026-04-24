import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ValkeyService } from '../../../../core/valkey/valkey.service';
import type { PoolCredentials } from '../cognito/cognito.types';
import { PoolResolverRepository } from './pool-resolver.repository';

const POOL_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class PoolResolverService {
  private readonly platformPoolId: string;
  private readonly platformClientId: string;
  private readonly storeAdminClientId: string;

  constructor(
    private readonly repository: PoolResolverRepository,
    private readonly valkey: ValkeyService,
    config: ConfigService,
  ) {
    this.platformPoolId = config.getOrThrow<string>('PLATFORM_COGNITO_POOL_ID');
    this.platformClientId = config.getOrThrow<string>('PLATFORM_COGNITO_PLATFORM_CLIENT_ID');
    this.storeAdminClientId = config.getOrThrow<string>('PLATFORM_COGNITO_STORE_ADMIN_CLIENT_ID');
  }

  getPlatformAdminPool(): PoolCredentials {
    return {
      userPoolId: this.platformPoolId,
      clientId: this.platformClientId,
    };
  }

  getStoreAdminPool(): PoolCredentials {
    return {
      userPoolId: this.platformPoolId,
      clientId: this.storeAdminClientId,
    };
  }

  async resolveTenantPool(tenantId: string, role: 'admin' | 'customer'): Promise<PoolCredentials> {
    if (role === 'admin') {
      return this.getStoreAdminPool();
    }

    const cacheKey = `pool:${tenantId}:${role}`;

    const cached = await this.valkey.getJson<PoolCredentials>(cacheKey);
    if (cached) return cached;

    const config = await this.repository.findByTenantId(tenantId);

    if (!config) {
      throw new NotFoundException('Tenant authentication is not configured');
    }

    const credentials: PoolCredentials = {
      userPoolId: config.userPoolId,
      clientId: config.customerClientId,
    };

    await this.valkey.setJson(cacheKey, credentials, POOL_CACHE_TTL);

    return credentials;
  }

  async invalidatePoolCache(tenantId: string): Promise<void> {
    await this.valkey.del(`pool:${tenantId}:admin`, `pool:${tenantId}:customer`);
  }
}
