import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { AuthPrincipal } from './auth.types';
import { AuthSessionRepository } from './auth-session.repository';
import { AuthSubjectRevocationsRepository } from './auth-subject-revocations.repository';
import { SuspiciousAuthTelemetryService } from './suspicious-auth-telemetry.service';

@Injectable()
export class SessionEnforcementService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly authSubjectRevocationsRepository: AuthSubjectRevocationsRepository,
    private readonly suspiciousAuthTelemetryService: SuspiciousAuthTelemetryService,
  ) {}

  async assertActive(principal: AuthPrincipal) {
    const session = await this.authSessionRepository.findById(principal.sessionId);

    if (!session || session.status !== 'active') {
      this.suspiciousAuthTelemetryService.record('inactive_session_presented', {
        actorType: principal.actorType,
        tenantId: principal.tenantId,
        sessionId: principal.sessionId,
      });
      throw new UnauthorizedException('Session is not active');
    }

    if (session.sessionVersion !== principal.sessionVersion) {
      this.suspiciousAuthTelemetryService.record('session_version_mismatch', {
        actorType: principal.actorType,
        tenantId: principal.tenantId,
        sessionId: principal.sessionId,
      });
      throw new UnauthorizedException('Session version mismatch');
    }

    const subjectRevocation = await this.authSubjectRevocationsRepository.findBySubject(
      principal.cognitoSub,
      principal.userPoolId,
    );

    if (subjectRevocation && new Date(subjectRevocation.revokeBefore) >= new Date(principal.issuedAt)) {
      this.suspiciousAuthTelemetryService.record('revoked_subject_reused', {
        actorType: principal.actorType,
        tenantId: principal.tenantId,
        sessionId: principal.sessionId,
        cognitoSub: principal.cognitoSub,
      });
      throw new UnauthorizedException('Subject has been revoked');
    }

    return session;
  }
}