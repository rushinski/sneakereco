import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { ResolvedRole, ResolvedTokenResult } from '../auth.types';
import { CognitoService } from '../cognito/cognito.service';
import type { PoolCredentials } from '../cognito/cognito.types';
import type { MfaSetupCompleteDto } from './mfa-setup-complete.dto';

@Injectable()
export class MfaSetupService {
  constructor(private readonly cognito: CognitoService) {}

  associate(session: string) {
    return this.cognito.associateSoftwareTokenWithSession(session);
  }

  async complete(
    dto: MfaSetupCompleteDto,
    params: { role: ResolvedRole; pool?: PoolCredentials },
  ): Promise<ResolvedTokenResult> {
    if (params.role === 'platform') {
      return {
        ...(await this.cognito.completeMfaSetupChallenge(dto)),
        authContext: 'platform',
      };
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    if (params.role === 'customer') {
      return {
        ...(await this.cognito.completeMfaSetupChallenge(dto, params.pool)),
        authContext: 'customer',
      };
    }

    try {
      return {
        ...(await this.cognito.completeMfaSetupChallenge(dto, params.pool)),
        authContext: 'admin',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        return {
          ...(await this.cognito.completeMfaSetupChallenge(dto)),
          authContext: 'platform',
        };
      }

      throw error;
    }
  }
}
