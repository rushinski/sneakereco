import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import type { LoginResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import type { LoginDto } from './login.dto';

type LoginRole = 'platform' | 'admin' | 'customer';

@Injectable()
export class LoginService {
  constructor(private readonly cognito: CognitoService) {}

  async login(
    dto: LoginDto,
    params: { role: LoginRole; pool?: PoolCredentials },
  ): Promise<LoginResult> {
    if (params.role === 'platform') {
      return this.cognito.login(dto);
    }

    if (!params.pool) {
      throw new InternalServerErrorException('Tenant pool was not resolved');
    }

    return this.cognito.login(dto, params.pool);
  }
}
