import { Injectable } from '@nestjs/common';

import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class MfaSetupService {
  constructor(private readonly cognitoAuthGateway: CognitoAuthGateway) {}

  async initiateSetup(accessToken: string): Promise<{ secretCode: string; otpAuthUrl: string; session: string }> {
    return this.cognitoAuthGateway.initiateCustomerMfaSetup(accessToken);
  }
}
