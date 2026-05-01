import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../audit/auth-audit.service';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';
import { SessionIssuerService } from '../session-control/session-issuer.service';

@Injectable()
export class CustomerLoginService {
  constructor(
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly sessionIssuerService: SessionIssuerService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async login(input: {
    tenantId: string;
    email: string;
    password: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const result = await this.cognitoAuthGateway.loginCustomer(input);
    const session = await this.sessionIssuerService.issue(result, input);
    this.authAuditService.record('auth.customer.login.completed', {
      tenantId: input.tenantId,
      email: input.email,
      sessionId: session.principal.sessionId,
    });

    return session;
  }
}
