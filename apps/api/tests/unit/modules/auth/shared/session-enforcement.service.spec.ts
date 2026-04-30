import { UnauthorizedException } from '@nestjs/common';

import { AuthSessionRepository } from '../../../../../src/modules/auth/shared/auth-session.repository';
import { AuthSubjectRevocationsRepository } from '../../../../../src/modules/auth/shared/auth-subject-revocations.repository';
import { SessionEnforcementService } from '../../../../../src/modules/auth/shared/session-enforcement.service';

describe('SessionEnforcementService', () => {
  it('accepts an active session with a matching version', async () => {
    const sessions = new AuthSessionRepository();
    const subjectRevocations = new AuthSubjectRevocationsRepository();
    const service = new SessionEnforcementService(sessions, subjectRevocations);

    const session = await sessions.create({
      actorType: 'tenant_admin',
      adminUserId: 'adm_123',
      tenantId: 'tnt_123',
      userPoolId: 'pool-1',
      appClientId: 'client-1',
      cognitoSub: 'sub-1',
      deviceId: 'device-1',
      sessionVersion: '1',
      refreshTokenFingerprint: 'fp-1',
      originJti: 'jti-1',
      status: 'active',
      issuedAt: '2026-04-28T12:00:00.000Z',
      expiresAt: '2026-04-29T12:00:00.000Z',
    });

    await expect(
      service.assertActive({
        actorType: 'tenant_admin',
        cognitoSub: 'sub-1',
        userPoolId: 'pool-1',
        appClientId: 'client-1',
        sessionId: session.id,
        sessionVersion: '1',
        issuedAt: '2026-04-28T12:00:00.000Z',
        groups: ['tenant_admin'],
        adminType: 'tenant_admin',
        tenantId: 'tnt_123',
      }),
    ).resolves.toMatchObject({
      id: session.id,
      status: 'active',
    });
  });

  it('rejects a revoked subject even if the token is otherwise well-formed', async () => {
    const sessions = new AuthSessionRepository();
    const subjectRevocations = new AuthSubjectRevocationsRepository();
    const service = new SessionEnforcementService(sessions, subjectRevocations);

    const session = await sessions.create({
      actorType: 'customer',
      customerUserId: 'cus_123',
      tenantId: 'tnt_123',
      userPoolId: 'pool-1',
      appClientId: 'client-1',
      cognitoSub: 'sub-1',
      deviceId: 'device-1',
      sessionVersion: '1',
      refreshTokenFingerprint: 'fp-1',
      originJti: 'jti-1',
      status: 'active',
      issuedAt: '2026-04-28T12:00:00.000Z',
      expiresAt: '2026-04-29T12:00:00.000Z',
    });
    await subjectRevocations.upsert('sub-1', 'pool-1', '2026-04-28T12:00:01.000Z');

    await expect(
      service.assertActive({
        actorType: 'customer',
        cognitoSub: 'sub-1',
        userPoolId: 'pool-1',
        appClientId: 'client-1',
        sessionId: session.id,
        sessionVersion: '1',
        issuedAt: '2026-04-28T12:00:00.000Z',
        groups: [],
        tenantId: 'tnt_123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});