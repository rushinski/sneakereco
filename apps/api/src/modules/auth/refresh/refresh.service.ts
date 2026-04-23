import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import type { RefreshResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';

type LoginRole = 'platform' | 'admin' | 'customer';

@Injectable()
export class RefreshService {
  constructor(private readonly cognito: CognitoService) {}

  async refresh(
    refreshToken: string,
    params: { role: LoginRole; pool?: PoolCredentials },
  ): Promise<RefreshResult> {
    if (params.role === 'platform') {
      return this.cognito.refreshTokens(refreshToken);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.refreshTokens(refreshToken, params.pool);
  }
}
