import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RequestCtx } from '../../../src/common/context/request-context';
import { SecurityConfig } from '../../../src/config/security.config';
import { CsrfService } from '../../../src/core/security/csrf/csrf.service';
import { SessionControlController } from '../../../src/modules/auth/session-control/session-control.controller';
import { SessionControlService } from '../../../src/modules/auth/session-control/session-control.service';
import { PoolResolverService } from '../../../src/modules/auth/shared/pool-resolver/pool-resolver.service';

describe('Revoke all sessions', () => {
  let app: INestApplication;
  const sessionControlService = {
    revokeAllSessions: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionControlController],
      providers: [
        { provide: SessionControlService, useValue: sessionControlService },
        {
          provide: PoolResolverService,
          useValue: {
            getPlatformAdminPool: () => ({ userPoolId: 'pool_platform', clientId: 'client_platform' }),
            getStoreAdminPool: () => ({
              userPoolId: 'pool_platform',
              clientId: 'client_store_admin',
            }),
          },
        },
        {
          provide: SecurityConfig,
          useValue: {
            cookieSecure: true,
          },
        },
        {
          provide: CsrfService,
          useValue: {
            protect: (_req: unknown, _res: unknown, next: (error?: unknown) => void) => next(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.use((req, _res, next) => {
      (req as typeof req & { user: unknown }).user = {
        cognitoSub: 'sub_123',
        email: 'owner@heatkings.com',
        isSuperAdmin: false,
        tenantId: 'tnt_heatkings',
        memberId: 'mbr_123',
        userType: 'store-admin',
        teamRole: 'admin',
        jti: 'access_jti_123',
      };

      RequestCtx.run(
        {
          requestId: 'req_test',
          host: 'admin.heatkings.com',
          hostType: 'store-public',
          surface: 'store-admin',
          canonicalHost: 'admin.heatkings.com',
          isCanonicalHost: true,
          origin: 'store-admin',
          tenantId: 'tnt_heatkings',
          tenantSlug: 'heatkings',
          pool: { userPoolId: 'pool_platform', clientId: 'client_store_admin' },
          user: (req as typeof req & { user: never }).user,
        },
        () => next(),
      );
    });
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app?.close();
  });

  it('revokes all sessions for the current user on the current surface', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/sessions/revoke-all')
      .set('Authorization', 'Bearer access_token')
      .expect(200);

    expect(sessionControlService.revokeAllSessions).toHaveBeenCalledTimes(1);
  });
});
