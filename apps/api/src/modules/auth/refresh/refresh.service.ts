import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthAuditService } from '../shared/auth-audit.service';
import { AuthSessionRepository } from '../shared/auth-session.repository';
import { CognitoAuthGateway } from '../shared/cognito-auth.gateway';

@Injectable()
export class RefreshService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async refresh(input: { sessionId: string; refreshToken: string }) {
    const session = await this.authSessionRepository.findById(input.sessionId);
    if (!session || session.status !== 'active') {
      throw new UnauthorizedException('Session is not active');
    }

    const refreshed = await this.cognitoAuthGateway.refreshSession(input);
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