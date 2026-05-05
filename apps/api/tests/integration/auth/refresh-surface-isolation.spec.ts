import cookie from '@fastify/cookie';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RequestCtx } from '../../../src/common/context/request-context';
import { CsrfService } from '../../../src/core/security/csrf/csrf.service';
import { RefreshController } from '../../../src/modules/auth/refresh/refresh.controller';
import { RefreshService } from '../../../src/modules/auth/refresh/refresh.service';

describe('Refresh surface isolation', () => {
  let app: INestApplication;
  const refreshService = {
    refresh: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RefreshController],
      providers: [
        { provide: RefreshService, useValue: refreshService },
        {
          provide: CsrfService,
          useValue: {
            protect: (_req: unknown) => undefined,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('v1');
    await app.register(cookie as any);
    app.getHttpAdapter().getInstance().addHook('onRequest', (req, _reply, done) => {
      const host = String(req.headers.host ?? 'admin.heatkings.com').toLowerCase();
      const surfaceHeader = req.headers['x-app-surface'];
      const surface = typeof surfaceHeader === 'string' ? surfaceHeader : 'customer';

      RequestCtx.run(
        {
          requestId: 'req_test',
          host,
          hostType: surface === 'platform-admin' ? 'platform' : 'store-public',
          surface: surface as 'platform-admin' | 'store-admin' | 'customer',
          canonicalHost: host,
          isCanonicalHost: true,
          origin: surface as 'platform-admin' | 'store-admin' | 'customer',
          tenantId: surface === 'platform-admin' ? null : 'tnt_heatkings',
          tenantSlug: surface === 'platform-admin' ? null : 'heatkings',
          pool:
            surface === 'customer'
              ? { userPoolId: 'pool_customer', clientId: 'client_customer' }
              : { userPoolId: 'pool_platform', clientId: 'client_store_admin' },
          user: null,
        },
        () => done(),
      );
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    refreshService.refresh.mockReset();
    await app?.close();
  });

  it('reads the refresh cookie for the current surface key', async () => {
    refreshService.refresh.mockResolvedValue({
      accessToken: 'access_token',
      idToken: 'id_token',
      expiresIn: 3600,
    });

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Host', 'admin.heatkings.com')
      .set('X-App-Surface', 'store-admin')
      .set('Cookie', '__Secure-sneakereco-refresh-store-admin-admin-heatkings-com=abc')
      .expect(200);

    expect(refreshService.refresh).toHaveBeenCalledWith('abc', {
      surface: 'store-admin',
      tenantId: 'tnt_heatkings',
    });
  });

  it('rejects a customer refresh cookie on the store-admin surface', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Host', 'admin.heatkings.com')
      .set('X-App-Surface', 'store-admin')
      .set('Cookie', '__Secure-sneakereco-refresh-customer-heatkings-sneakereco-com=abc')
      .expect(401);

    expect(refreshService.refresh).not.toHaveBeenCalled();
  });
});
