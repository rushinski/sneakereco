import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../audit/auth-audit.service';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class RegisterService {
  constructor(
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async register(input: {
    tenantId: string;
    email: string;
    password: string;
    fullName?: string;
  }) {
    const result = await this.cognitoAuthGateway.registerCustomer(input);
    this.authAuditService.record('auth.customer.registered', {
      tenantId: input.tenantId,
      email: input.email,
    });

    return result;
  }
}
