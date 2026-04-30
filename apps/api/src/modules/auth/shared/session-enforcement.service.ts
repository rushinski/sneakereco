import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { AuthPrincipal } from './auth.types';
import { AuthSessionRepository } from './auth-session.repository';
import { AuthSubjectRevocationsRepository } from './auth-subject-revocations.repository';

@Injectable()
export class SessionEnforcementService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly authSubjectRevocationsRepository: AuthSubjectRevocationsRepository,
  ) {}

  async assertActive(principal: AuthPrincipal) {
    const session = await this.authSessionRepository.findById(principal.sessionId);

    if (!session || session.status !== 'active') {
      throw new UnauthorizedException('Session is not active');
    }

    if (session.sessionVersion !== principal.sessionVersion) {
      throw new UnauthorizedException('Session version mismatch');
    }

    const subjectRevocation = await this.authSubjectRevocationsRepository.findBySubject(
      principal.cognitoSub,
      principal.userPoolId,
    );

    if (subjectRevocation && new Date(subjectRevocation.revokeBefore) >= new Date(principal.issuedAt)) {
      throw new UnauthorizedException('Subject has been revoked');
    }

    return session;
  }
}