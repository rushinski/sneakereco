import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { RefreshResult, ResolvedRole } from '../auth.types';
import { CognitoService } from '../cognito/cognito.service';
import type { PoolCredentials } from '../cognito/cognito.types';

@Injectable()
export class RefreshService {
  constructor(private readonly cognito: CognitoService) {}

  async refresh(
    refreshToken: string,
    params: { role: ResolvedRole; pool?: PoolCredentials },
  ): Promise<RefreshResult> {
    if (params.role === 'platform') {
      return this.cognito.refreshTokens(refreshToken);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    if (params.role === 'customer') {
      return this.cognito.refreshTokens(refreshToken, params.pool);
    }

    try {
      return await this.cognito.refreshTokens(refreshToken, params.pool);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        return this.cognito.refreshTokens(refreshToken);
      }

      throw error;
    }
  }
}
