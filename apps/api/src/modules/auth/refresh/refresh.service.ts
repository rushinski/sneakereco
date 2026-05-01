import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthAuditService } from '../audit/auth-audit.service';
import { AuthSessionRepository } from '../session-control/auth-session.repository';
import { SuspiciousAuthTelemetryService } from '../audit/suspicious-auth-telemetry.service';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class RefreshService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly authAuditService: AuthAuditService,
    private readonly suspiciousAuthTelemetryService: SuspiciousAuthTelemetryService,
  ) {}

  async refresh(input: { sessionId: string; refreshToken: string }) {
    const session = await this.authSessionRepository.findById(input.sessionId);
    if (!session || session.status !== 'active') {
      this.suspiciousAuthTelemetryService.record('refresh_rejected_inactive_session', {
        sessionId: input.sessionId,
      });
      throw new UnauthorizedException('Session is not active');
    }

    const refreshed = await this.cognitoAuthGateway.refreshSession({
      ...input,
      userPoolId: session.userPoolId,
      appClientId: session.appClientId,
      actorType: session.actorType,
    });
    await this.authSessionRepository.touchRefresh(session.id);
    this.authAuditService.record('auth.refresh.completed', {
      sessionId: session.id,
      actorType: session.actorType,
    });

    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      principal: {
        actorType: session.actorType,
        cognitoSub: session.cognitoSub,
        userPoolId: session.userPoolId,
        appClientId: session.appClientId,
        sessionId: session.id,
        sessionVersion: session.sessionVersion,
        issuedAt: session.issuedAt,
        groups: [],
        tenantId: session.tenantId,
      },
    };
  }
}
