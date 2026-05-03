import { Injectable } from '@nestjs/common';

import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class MfaVerifySetupService {
  constructor(private readonly cognitoAuthGateway: CognitoAuthGateway) {}

  async verifySetup(accessToken: string, session: string, userCode: string): Promise<void> {
    return this.cognitoAuthGateway.verifyCustomerMfaSetup(accessToken, session, userCode);
  }
}
