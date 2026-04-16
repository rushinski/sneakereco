import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type {
  ResolvedLoginResult,
  ResolvedRole,
} from '../auth.types';
import { CognitoService } from '../cognito/cognito.service';
import type { PoolCredentials } from '../cognito/cognito.types';
import type { LoginDto } from './login.dto';

@Injectable()
export class LoginService {
  constructor(private readonly cognito: CognitoService) {}

  async login(
    dto: LoginDto,
    params: { role: ResolvedRole; pool?: PoolCredentials },
  ): Promise<ResolvedLoginResult> {
    if (params.role === 'platform') {
      return this.withAuthContext(await this.cognito.login(dto), 'platform');
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    if (params.role === 'customer') {
      return this.withAuthContext(await this.cognito.login(dto, params.pool), 'customer');
    }

    try {
      return this.withAuthContext(await this.cognito.login(dto, params.pool), 'admin');
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        return this.withAuthContext(await this.cognito.login(dto), 'platform');
      }

      throw error;
    }
  }

  private withAuthContext(
    result: Awaited<ReturnType<CognitoService['login']>>,
    authContext: ResolvedRole,
  ): ResolvedLoginResult {
    if (result.type !== 'tokens') {
      return result;
    }

    return {
      ...result,
      authContext,
    };
  }
}
