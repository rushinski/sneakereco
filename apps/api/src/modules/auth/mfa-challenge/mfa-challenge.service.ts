import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import type { TokenResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import type { MfaChallengeDto } from './mfa-challenge.dto';

type LoginRole = 'platform' | 'admin' | 'customer';

@Injectable()
export class MfaChallengeService {
  constructor(private readonly cognito: CognitoService) {}

  async respond(
    dto: MfaChallengeDto,
    params: { role: LoginRole; pool?: PoolCredentials },
  ): Promise<TokenResult> {
    if (params.role === 'platform') {
      return this.cognito.respondToMfaChallenge(dto);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.respondToMfaChallenge(dto, params.pool);
  }
}
