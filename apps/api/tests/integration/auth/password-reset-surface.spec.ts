import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RequestCtx } from '../../../src/common/context/request-context';
import { PasswordResetController } from '../../../src/modules/auth/password-reset/password-reset.controller';
import { PasswordResetService } from '../../../src/modules/auth/password-reset/password-reset.service';

describe('Password reset surface handling', () => {
  let app: INestApplication;
  const passwordResetService = {
    forgotPassword: jest.fn().mockResolvedValue({ success: true }),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PasswordResetController],
      providers: [{ provide: PasswordResetService, useValue: passwordResetService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.use((req, _res, next) => {
      const surfaceHeader = req.headers['x-app-surface'];
      const surface = typeof surfaceHeader === 'string' ? surfaceHeader : 'customer';

      RequestCtx.run(
        {
          requestId: 'req_test',
          host: String(req.headers.host ?? 'admin.heatkings.com').toLowerCase(),
          hostType: surface === 'platform-admin' ? 'platform' : 'store-public',
          surface: surface as 'platform-admin' | 'store-admin' | 'customer',
          canonicalHost: 'admin.heatkings.com',
          isCanonicalHost: true,
          origin: surface as 'platform-admin' | 'store-admin' | 'customer',
          tenantId: surface === 'platform-admin' ? null : 'tnt_heatkings',
          tenantSlug: surface === 'platform-admin' ? null : 'heatkings',
          pool:
            surface === 'customer'
              ? { userPoolId: 'pool_customer', clientId: 'client_customer' }
              : surface === 'store-admin'
                ? { userPoolId: 'pool_platform', clientId: 'client_store_admin' }
                : null,
          user: null,
        },
        () => next(),
      );
    });
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('uses the store-admin pool on the store-admin surface', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .set('X-App-Surface', 'store-admin')
      .send({ email: 'owner@heatkings.com' })
      .expect(200);

    expect(passwordResetService.forgotPassword).toHaveBeenCalledWith(
      { email: 'owner@heatkings.com' },
      { userPoolId: 'pool_platform', clientId: 'client_store_admin' },
    );
  });

  it('rejects password reset on the platform-admin surface', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .set('X-App-Surface', 'platform-admin')
      .send({ email: 'operator@sneakereco.com' })
      .expect(403);
  });
});
