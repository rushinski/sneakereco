import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import type { TokenResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import type { MfaSetupCompleteDto } from './mfa-setup-complete.dto';

type LoginRole = 'platform' | 'admin' | 'customer';

@Injectable()
export class MfaSetupService {
  constructor(private readonly cognito: CognitoService) {}

  associate(session: string) {
    return this.cognito.associateSoftwareTokenWithSession(session);
  }

  async complete(
    dto: MfaSetupCompleteDto,
    params: { role: LoginRole; pool?: PoolCredentials },
  ): Promise<TokenResult> {
    if (params.role === 'platform') {
      return this.cognito.completeMfaSetupChallenge(dto);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.completeMfaSetupChallenge(dto, params.pool);
  }
}
