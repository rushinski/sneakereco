import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import type { RefreshResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import { PoolResolverService } from '../shared/pool-resolver/pool-resolver.service';

type LoginRole = 'platform' | 'admin' | 'customer';

@Injectable()
export class RefreshService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  async refresh(
    refreshToken: string,
    params: { role: LoginRole; pool?: PoolCredentials; tenantId?: string },
  ): Promise<RefreshResult> {
    if (params.role === 'platform') {
      return this.cognito.refreshTokens(refreshToken, this.poolResolver.getPlatformAdminPool());
    }

    if (params.role === 'admin') {
      if (!params.tenantId) {
        throw new InternalServerErrorException('Tenant context was not resolved');
      }

      try {
        return await this.cognito.refreshTokens(
          refreshToken,
          this.poolResolver.getTenantAdminPool(),
        );
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          throw error;
        }

        return this.cognito.refreshTokens(refreshToken, this.poolResolver.getPlatformAdminPool());
      }
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.refreshTokens(refreshToken, params.pool);
  }
}
