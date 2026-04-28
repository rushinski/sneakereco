import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import type { TokenResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import { AdminAccountClassifierService } from '../shared/pool-resolver/admin-account-classifier.service';
import { PoolResolverService } from '../shared/pool-resolver/pool-resolver.service';

import type { MfaChallengeDto } from './mfa-challenge.dto';

type LoginSurface = 'platform-admin' | 'store-admin' | 'customer';

@Injectable()
export class MfaChallengeService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly poolResolver: PoolResolverService,
    private readonly classifier: AdminAccountClassifierService,
  ) {}

  async respond(
    dto: MfaChallengeDto,
    params: { surface: LoginSurface; pool?: PoolCredentials; tenantId?: string },
  ): Promise<TokenResult> {
    if (params.surface === 'platform-admin') {
      return this.cognito.respondToMfaChallenge(dto, this.poolResolver.getPlatformAdminPool());
    }

    if (params.surface === 'store-admin') {
      if (!params.tenantId) {
        throw new InternalServerErrorException('Tenant context was not resolved');
      }

      const audience = await this.classifier.classifyForStoreAdminSurface({
        email: dto.email,
        tenantId: params.tenantId,
      });

      if (audience === 'unavailable') {
        throw new UnauthorizedException('Invalid MFA challenge');
      }

      const pool =
        audience === 'store-admin'
          ? this.poolResolver.getStoreAdminPool()
          : this.poolResolver.getPlatformAdminPool();
      return this.cognito.respondToMfaChallenge(dto, pool);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.respondToMfaChallenge(dto, params.pool);
  }
}
