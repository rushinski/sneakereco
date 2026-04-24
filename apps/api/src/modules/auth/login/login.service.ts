import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import type { LoginResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import { AdminAccountClassifierService } from '../shared/pool-resolver/admin-account-classifier.service';
import { PoolResolverService } from '../shared/pool-resolver/pool-resolver.service';
import type { LoginDto } from './login.dto';

type LoginSurface = 'platform-admin' | 'store-admin' | 'customer';

@Injectable()
export class LoginService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly poolResolver: PoolResolverService,
    private readonly classifier: AdminAccountClassifierService,
  ) {}

  async login(
    dto: LoginDto,
    params: { surface: LoginSurface; pool?: PoolCredentials; tenantId?: string },
  ): Promise<LoginResult> {
    if (params.surface === 'platform-admin') {
      return this.cognito.login(dto, this.poolResolver.getPlatformAdminPool());
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
        throw new UnauthorizedException('Invalid email or password');
      }

      const pool =
        audience === 'store-admin'
          ? this.poolResolver.getStoreAdminPool()
          : this.poolResolver.getPlatformAdminPool();
      return this.cognito.login(dto, pool);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.login(dto, params.pool);
  }
}
