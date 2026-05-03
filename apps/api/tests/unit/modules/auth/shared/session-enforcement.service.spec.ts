import { UnauthorizedException } from '@nestjs/common';

import type { AuthSessionRecord } from '../../../../../src/modules/auth/session-control/auth-session.repository';
import type { AuthSessionRepository } from '../../../../../src/modules/auth/session-control/auth-session.repository';
import type { AuthSubjectRevocationsRepository } from '../../../../../src/modules/auth/session-control/auth-subject-revocations.repository';
import { SessionEnforcementService } from '../../../../../src/modules/auth/session-control/session-enforcement.service';
import { SuspiciousAuthTelemetryService } from '../../../../../src/modules/auth/audit/suspicious-auth-telemetry.service';

const activeSession: AuthSessionRecord = {
  id: 'ses_test_1',
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
};

const customerSession: AuthSessionRecord = {
  id: 'ses_test_2',
  actorType: 'customer',
  customerUserId: 'cus_123',
  tenantId: 'tnt_123',
  userPoolId: 'pool-1',
  appClientId: 'client-1',
  cognitoSub: 'sub-1',
  deviceId: 'device-1',
  sessionVersion: '1',
  refreshTokenFingerprint: 'fp-2',
  originJti: 'jti-2',
  status: 'active',
  issuedAt: '2026-04-28T12:00:00.000Z',
  expiresAt: '2026-04-29T12:00:00.000Z',
};

function makeSessions(
  session: AuthSessionRecord,
): Pick<AuthSessionRepository, 'findById' | 'findActiveBySubject' | 'create' | 'revokeById' | 'revokeBySubject' | 'touchRefresh'> {
  return {
    create: jest.fn().mockResolvedValue(session),
    findById: jest.fn().mockResolvedValue(session),
    findActiveBySubject: jest.fn().mockResolvedValue([session]),
    revokeById: jest.fn().mockResolvedValue(undefined),
    revokeBySubject: jest.fn().mockResolvedValue(undefined),
    touchRefresh: jest.fn().mockResolvedValue(undefined),
  };
}

describe('SessionEnforcementService', () => {
  it('accepts an active session with a matching version', async () => {
    const sessions = makeSessions(activeSession) as AuthSessionRepository;
    const subjectRevocations = {
      findBySubject: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    } as unknown as AuthSubjectRevocationsRepository;
    const service = new SessionEnforcementService(
      sessions,
      subjectRevocations,
      { record: jest.fn() } as unknown as SuspiciousAuthTelemetryService,
    );

    await expect(
      service.assertActive({
        actorType: 'tenant_admin',
        cognitoSub: 'sub-1',
        userPoolId: 'pool-1',
        appClientId: 'client-1',
        sessionId: activeSession.id,
        sessionVersion: '1',
        issuedAt: '2026-04-28T12:00:00.000Z',
        groups: ['tenant_admin'],
        adminType: 'tenant_admin',
        tenantId: 'tnt_123',
      }),
    ).resolves.toMatchObject({
      id: activeSession.id,
      status: 'active',
    });
  });

  it('rejects a revoked subject even if the token is otherwise well-formed', async () => {
    const sessions = makeSessions(customerSession) as AuthSessionRepository;
    const subjectRevocations = {
      findBySubject: jest.fn().mockResolvedValue({
        id: 'rev_1',
        cognitoSub: 'sub-1',
        userPoolId: 'pool-1',
        revokeBefore: '2026-04-28T12:00:01.000Z',
      }),
      upsert: jest.fn(),
    } as unknown as AuthSubjectRevocationsRepository;
    const service = new SessionEnforcementService(
      sessions,
      subjectRevocations,
      { record: jest.fn() } as unknown as SuspiciousAuthTelemetryService,
    );

    await expect(
      service.assertActive({
        actorType: 'customer',
        cognitoSub: 'sub-1',
        userPoolId: 'pool-1',
        appClientId: 'client-1',
        sessionId: customerSession.id,
        sessionVersion: '1',
        issuedAt: '2026-04-28T12:00:00.000Z',
        groups: [],
        tenantId: 'tnt_123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
