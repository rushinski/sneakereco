import { Injectable } from '@nestjs/common';

import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class MfaEnableService {
  constructor(private readonly cognitoAuthGateway: CognitoAuthGateway) {}

  async enable(accessToken: string): Promise<void> {
    return this.cognitoAuthGateway.setCustomerMfaPreference(accessToken, true);
  }
}
