import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../shared/auth-audit.service';
import { CognitoAuthGateway } from '../shared/cognito-auth.gateway';
import { SessionIssuerService } from '../shared/session-issuer.service';

@Injectable()
export class OtpService {
  constructor(
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly sessionIssuerService: SessionIssuerService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async request(input: { tenantId: string; email: string }) {
    const result = await this.cognitoAuthGateway.requestEmailOtp(input);
    this.authAuditService.record('auth.otp.requested', input);
    return result;
  }

  async complete(input: {
    tenantId: string;
    email: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const challenge = await this.cognitoAuthGateway.completeEmailOtp(input);
    const session = await this.sessionIssuerService.issue(challenge, input);
    this.authAuditService.record('auth.otp.completed', {
      tenantId: input.tenantId,
      email: input.email,
      sessionId: session.principal.sessionId,
    });
    return session;
  }
}