import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';

import { AuthModule } from '../../../../src/modules/auth/auth.module';
import { AdminUsersRepository } from '../../../../src/modules/auth/admin-users/admin-users.repository';
import { CognitoAuthGateway } from '../../../../src/modules/auth/gateways/cognito-auth.gateway';
import { CustomerUsersRepository } from '../../../../src/modules/auth/customer-users/customer-users.repository';

describe('Auth flows', () => {
  beforeAll(() => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      PORT: '3000',
      LOG_LEVEL: 'debug',
      REQUEST_ID_HEADER: 'x-request-id',
      CORRELATION_ID_HEADER: 'x-correlation-id',
      BASE_DOMAIN: 'sneakereco.test',
      API_BASE_URL: 'http://127.0.0.1:3000',
      PLATFORM_URL: 'https://sneakereco.test',
      PLATFORM_DASHBOARD_URL: 'https://dashboard.sneakereco.test',
      DATABASE_URL: 'postgresql://app:pass@localhost:5432/db',
      DATABASE_SYSTEM_URL: 'postgresql://sys:pass@localhost:5432/db',
      DATABASE_POOL_MIN: '2',
      DATABASE_POOL_MAX: '20',
      VALKEY_URL: 'redis://localhost:6379',
      QUEUE_PREFIX: 'sneakereco',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'local',
      AWS_SECRET_ACCESS_KEY: 'local',
      COGNITO_ADMIN_USER_POOL_ID: 'pool-1',
      COGNITO_PLATFORM_ADMIN_CLIENT_ID: 'platform-client',
      COGNITO_TENANT_ADMIN_CLIENT_ID: 'tenant-client',
      ACCESS_TOKEN_TTL_SECONDS: '1800',
      ADMIN_REFRESH_TOKEN_TTL_SECONDS: '86400',
      CUSTOMER_REFRESH_TOKEN_TTL_SECONDS: '2592000',
      AUTH_CHALLENGE_SESSION_TTL_SECONDS: '600',
      CSRF_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      SESSION_SIGNING_SECRET: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      MAIL_TRANSPORT: 'smtp',
      PLATFORM_FROM_EMAIL: 'noreply@sneakereco.com',
      PLATFORM_FROM_NAME: 'SneakerEco',
      PLATFORM_ADMIN_EMAIL: 'admin@sneakereco.com',
      OPS_API_TOKEN: 'ops-token-test-1234',
    });
  });

  async function createApp() {
    const cognitoGateway = {
      adminLogin: jest.fn().mockResolvedValue({
        status: 'mfa_required',
        challengeType: 'totp',
        challengeSessionToken: 'challenge-session-token',
      }),
      completeMfaChallenge: jest.fn().mockResolvedValue({
        actorType: 'tenant_admin',
        cognitoSub: 'admin-sub',
        userPoolId: 'pool-1',
        appClientId: 'tenant-client',
        groups: ['tenant_admin'],
        email: 'owner@heatkings.com',
        tenantId: 'tnt_heatkings',
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        originJti: 'origin-jti-1',
      }),
      registerCustomer: jest.fn().mockResolvedValue({
        status: 'confirmation_required',
      }),
      confirmCustomerEmail: jest.fn().mockResolvedValue({
        cognitoSub: 'customer-sub',
        userPoolId: 'tenant-pool-1',
        email: 'customer@example.com',
        fullName: 'Customer Example',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(CognitoAuthGateway)
      .useValue(cognitoGateway)
      .compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return {
      app,
      cognitoGateway,
      adminUsersRepository: app.get(AdminUsersRepository),
      customerUsersRepository: app.get(CustomerUsersRepository),
    };
  }

  function principalHeaders(principal: Record<string, string | string[]>) {
    const payload = Buffer.from(JSON.stringify(principal)).toString('base64url');
    const signature = createHmac('sha256', String(process.env.SESSION_SIGNING_SECRET))
      .update(payload)
      .digest('base64url');

    return {
      'x-auth-principal': payload,
      'x-auth-principal-signature': signature,
    };
  }

  it('handles admin login followed by MFA challenge completion', async () => {
    const { app, adminUsersRepository } = await createApp();
    await adminUsersRepository.create({
      email: 'owner@heatkings.com',
      fullName: 'Heat Kings Owner',
      cognitoSub: 'admin-sub',
      adminType: 'tenant_scoped_admin',
      status: 'pending_setup',
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/admin/login',
      payload: {
        email: 'owner@heatkings.com',
        password: 'Password123!',
      },
    });
    expect(loginResponse.statusCode).toBe(201);
    expect(loginResponse.json()).toEqual({
      status: 'mfa_required',
      challengeType: 'totp',
      challengeSessionToken: 'challenge-session-token',
    });

    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/auth/mfa/challenge',
      payload: {
        challengeSessionToken: 'challenge-session-token',
        code: '123456',
        deviceId: 'device-1',
      },
    });
    expect(challengeResponse.statusCode).toBe(201);
    const body = challengeResponse.json();
    expect(body.principal.actorType).toBe('tenant_admin');
    expect(body.principal.sessionId).toMatch(/^ses_/);
    await app.close();
  });

  it('creates a local customer user only after email confirmation', async () => {
    const { app, customerUsersRepository } = await createApp();

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantId: 'tnt_heatkings',
        email: 'customer@example.com',
        password: 'Password123!',
        fullName: 'Customer Example',
      },
    });
    expect(registerResponse.statusCode).toBe(201);
    expect(
      await customerUsersRepository.findByTenantAndEmail('tnt_heatkings', 'customer@example.com'),
    ).toBeNull();

    const confirmResponse = await app.inject({
      method: 'POST',
      url: '/auth/confirm-email',
      payload: {
        tenantId: 'tnt_heatkings',
        email: 'customer@example.com',
        code: '123456',
      },
    });
    expect(confirmResponse.statusCode).toBe(201);
    const customerUser = await customerUsersRepository.findByTenantAndEmail(
      'tnt_heatkings',
      'customer@example.com',
    );
    expect(customerUser?.id).toMatch(/^cus_/);
    await app.close();
  });

  it('invalidates an issued principal after logout-all', async () => {
    const { app, adminUsersRepository } = await createApp();
    await adminUsersRepository.create({
      email: 'owner@heatkings.com',
      fullName: 'Heat Kings Owner',
      cognitoSub: 'admin-sub',
      adminType: 'tenant_scoped_admin',
      status: 'pending_setup',
    });

    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/auth/mfa/challenge',
      payload: {
        challengeSessionToken: 'challenge-session-token',
        code: '123456',
        deviceId: 'device-1',
      },
    });
    const principal = challengeResponse.json().principal;
    const headerPrincipal = {
      sub: principal.cognitoSub,
      iss: principal.userPoolId,
      client_id: principal.appClientId,
      'custom:admin_type': principal.adminType,
      'custom:tenant_id': principal.tenantId,
      'custom:session_id': principal.sessionId,
      'custom:session_version': principal.sessionVersion,
      'cognito:groups': principal.groups,
      iat: principal.issuedAt,
    };

    const meBeforeLogout = await app.inject({
      method: 'GET',
      url: '/auth/session-control/me',
      headers: principalHeaders(headerPrincipal),
    });
    expect(meBeforeLogout.statusCode).toBe(200);

    const logoutAll = await app.inject({
      method: 'POST',
      url: '/auth/session-control/logout-all',
      headers: principalHeaders(headerPrincipal),
    });
    expect(logoutAll.statusCode).toBe(201);

    const meAfterLogout = await app.inject({
      method: 'GET',
      url: '/auth/session-control/me',
      headers: principalHeaders(headerPrincipal),
    });
    expect(meAfterLogout.statusCode).toBe(401);
    await app.close();
  });

  it('rejects a forged actor type even when session id and version are valid', async () => {
    const { app, adminUsersRepository } = await createApp();
    await adminUsersRepository.create({
      email: 'owner@heatkings.com',
      fullName: 'Heat Kings Owner',
      cognitoSub: 'admin-sub',
      adminType: 'tenant_scoped_admin',
      status: 'pending_setup',
    });

    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/auth/mfa/challenge',
      payload: {
        challengeSessionToken: 'challenge-session-token',
        code: '123456',
        deviceId: 'device-1',
      },
    });
    const principal = challengeResponse.json().principal;

    const forgedMe = await app.inject({
      method: 'GET',
      url: '/auth/session-control/me',
      headers: principalHeaders({
        sub: principal.cognitoSub,
        iss: principal.userPoolId,
        client_id: principal.appClientId,
        'custom:admin_type': 'platform_admin',
        'custom:session_id': principal.sessionId,
        'custom:session_version': principal.sessionVersion,
        'cognito:groups': ['platform_admin'],
        iat: principal.issuedAt,
      }),
    });

    expect(forgedMe.statusCode).toBe(401);
    await app.close();
  });
});
