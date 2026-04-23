import { Injectable, InternalServerErrorException } from '@nestjs/common';

import type { TokenResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import { PoolResolverService } from '../shared/pool-resolver/pool-resolver.service';
import type { MfaSetupCompleteDto } from './mfa-setup-complete.dto';

type LoginRole = 'platform' | 'admin' | 'customer';

@Injectable()
export class MfaSetupService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  associate(session: string) {
    return this.cognito.associateSoftwareTokenWithSession(session);
  }

  async complete(
    dto: MfaSetupCompleteDto,
    params: { role: LoginRole; pool?: PoolCredentials; tenantId?: string },
  ): Promise<TokenResult> {
    if (params.role === 'platform') {
      return this.cognito.completeMfaSetupChallenge(dto, this.poolResolver.getPlatformAdminPool());
    }

    if (params.role === 'admin') {
      if (!params.tenantId) {
        throw new InternalServerErrorException('Tenant context was not resolved');
      }

      const pool = await this.poolResolver.resolveAdminAuthPool(params.tenantId, dto.email);
      return this.cognito.completeMfaSetupChallenge(dto, pool);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.completeMfaSetupChallenge(dto, params.pool);
  }
}
