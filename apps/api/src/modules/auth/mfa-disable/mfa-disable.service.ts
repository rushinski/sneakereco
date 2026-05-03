import { Injectable } from '@nestjs/common';

import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class MfaDisableService {
  constructor(private readonly cognitoAuthGateway: CognitoAuthGateway) {}

  async disable(accessToken: string): Promise<void> {
    return this.cognitoAuthGateway.setCustomerMfaPreference(accessToken, false);
  }
}
