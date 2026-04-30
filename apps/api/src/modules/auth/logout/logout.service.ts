import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../shared/auth-audit.service';
import { AuthSessionRepository } from '../shared/auth-session.repository';
import { AuthSubjectRevocationsRepository } from '../shared/auth-subject-revocations.repository';
import type { AuthPrincipal } from '../shared/auth.types';

@Injectable()
export class LogoutService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly authSubjectRevocationsRepository: AuthSubjectRevocationsRepository,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async logout(principal: AuthPrincipal) {
    await this.authSessionRepository.revokeById(principal.sessionId, 'logout');
    this.authAuditService.record('auth.logout.completed', {
      cognitoSub: principal.cognitoSub,
      sessionId: principal.sessionId,
    });

    return { status: 'revoked', sessionId: principal.sessionId };
  }

  async logoutAll(principal: AuthPrincipal) {
    const revokeBefore = new Date().toISOString();
    await this.authSessionRepository.revokeBySubject(
      principal.cognitoSub,
      principal.userPoolId,
      'logout_all',
    );
    await this.authSubjectRevocationsRepository.upsert(
      principal.cognitoSub,
      principal.userPoolId,
      revokeBefore,
    );
    this.authAuditService.record('auth.logout_all.completed', {
      cognitoSub: principal.cognitoSub,
      userPoolId: principal.userPoolId,
    });

    return { status: 'revoked', revokeBefore };
  }
}