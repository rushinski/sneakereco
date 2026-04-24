import { buildSurfaceCookieNames } from '../../../../../src/modules/auth/shared/tokens/auth-cookie';
import { SessionControlService } from '../../../../../src/modules/auth/session-control/session-control.service';

describe('surface cookie names', () => {
  it('produces a unique refresh cookie per surface key', () => {
    expect(buildSurfaceCookieNames('store-admin:admin.heatkings.com').refresh).toBe(
      '__Secure-sneakereco-refresh-store-admin-admin-heatkings-com',
    );
  });
});

describe('SessionControlService', () => {
  it('revokes the current session refresh token and persists its lineage revocation', async () => {
    const repository = {
      insertLineageRevocation: jest.fn().mockResolvedValue(undefined),
      upsertSubjectRevocation: jest.fn().mockResolvedValue(undefined),
    };
    const cognito = {
      revokeToken: jest.fn().mockResolvedValue(undefined),
      adminGlobalSignOut: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SessionControlService(repository as never, cognito as never);
    const expiresAt = new Date('2026-05-24T12:00:00.000Z');

    await service.revokeCurrentSession({
      cognitoSub: 'sub_123',
      userPoolId: 'pool_123',
      originJti: 'origin_123',
      refreshToken: 'refresh_123',
      pool: {
        userPoolId: 'pool_123',
        clientId: 'client_123',
      },
      surfaceKey: 'store-admin:admin.heatkings.com',
      expiresAt,
    });

    expect(cognito.revokeToken).toHaveBeenCalledWith('refresh_123', 'client_123');
    expect(repository.insertLineageRevocation).toHaveBeenCalledWith({
      cognitoSub: 'sub_123',
      userPoolId: 'pool_123',
      originJti: 'origin_123',
      surfaceKey: 'store-admin:admin.heatkings.com',
      expiresAt,
    });
  });

  it('persists a subject-wide cutoff and signs the user out everywhere', async () => {
    const repository = {
      insertLineageRevocation: jest.fn().mockResolvedValue(undefined),
      upsertSubjectRevocation: jest.fn().mockResolvedValue(undefined),
    };
    const cognito = {
      revokeToken: jest.fn().mockResolvedValue(undefined),
      adminGlobalSignOut: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SessionControlService(repository as never, cognito as never);
    const revokeBefore = new Date('2026-04-24T12:00:00.000Z');

    await service.revokeAllSessions({
      cognitoSub: 'sub_123',
      userPoolId: 'pool_123',
      revokeBefore,
    });

    expect(repository.upsertSubjectRevocation).toHaveBeenCalledWith({
      cognitoSub: 'sub_123',
      userPoolId: 'pool_123',
      revokeBefore,
    });
    expect(cognito.adminGlobalSignOut).toHaveBeenCalledWith('sub_123', 'pool_123');
  });
});
