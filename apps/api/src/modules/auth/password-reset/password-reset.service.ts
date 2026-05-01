import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../audit/auth-audit.service';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async requestReset(input: { tenantId: string; email: string }) {
    const result = await this.cognitoAuthGateway.requestPasswordReset(input);
    this.authAuditService.record('auth.password_reset.requested', input);
    return result;
  }

  async completeReset(input: {
    tenantId: string;
    email: string;
    code: string;
    newPassword: string;
  }) {
    const result = await this.cognitoAuthGateway.resetPassword(input);
    this.authAuditService.record('auth.password_reset.completed', {
      tenantId: input.tenantId,
      email: input.email,
    });
    return result;
  }
}
