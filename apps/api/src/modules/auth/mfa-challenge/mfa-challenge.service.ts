import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthAuditService } from '../shared/auth-audit.service';
import { CognitoAuthGateway } from '../shared/cognito-auth.gateway';
import { SessionIssuerService } from '../shared/session-issuer.service';

@Injectable()
export class MfaChallengeService {
  constructor(
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly sessionIssuerService: SessionIssuerService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async complete(input: {
    challengeSessionToken: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const challenge = await this.cognitoAuthGateway.completeMfaChallenge(input);
    const session = await this.sessionIssuerService.issue(challenge, input);

    this.authAuditService.record('auth.mfa.challenge.completed', {
      cognitoSub: challenge.cognitoSub,
      sessionId: session.principal.sessionId,
    });

    return session;
  }
}