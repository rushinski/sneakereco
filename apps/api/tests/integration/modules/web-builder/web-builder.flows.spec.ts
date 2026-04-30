import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

import { WebBuilderModule } from '../../../../src/modules/web-builder/web-builder.module';
import { DesignFamilyRegistryRepository } from '../../../../src/modules/web-builder/design-family-registry.repository';

describe('Web builder flows', () => {
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
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      PLATFORM_FROM_EMAIL: 'noreply@sneakereco.com',
      PLATFORM_FROM_NAME: 'SneakerEco',
      PLATFORM_ADMIN_EMAIL: 'admin@sneakereco.com',
      OPS_API_TOKEN: 'ops-token-test-1234',
    });
  });
  
  async function createApp() {
    const moduleRef = await Test.createTestingModule({
      imports: [WebBuilderModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return {
      app,
      families: await app.get(DesignFamilyRegistryRepository).list(),
    };
  }

  it('supports draft save, scheduled publish, and rollback', async () => {
    const { app, families } = await createApp();
    const familyId = families[0].id;

    const themeDraft = await app.inject({
      method: 'POST',
      url: '/web-builder/theme-configs/drafts',
      payload: {
        tenantId: 'tnt_heatkings',
        designFamilyId: familyId,
        tokens: {
          brand: '#111111',
          accent: '#ff0000',
        },
      },
    });
    expect(themeDraft.statusCode).toBe(201);

    const authPageDraft = await app.inject({
      method: 'POST',
      url: '/web-builder/auth-page-configs/drafts',
      payload: {
        tenantId: 'tnt_heatkings',
        pageType: 'login',
        designFamilyId: familyId,
        requiredCapabilities: ['primary_sign_in', 'forgot_password_path', 'registration_navigation'],
        enabledFeatures: {
          signupEnabled: true,
          forgotPasswordEnabled: true,
        },
        slotAssignments: {
          shell: 'split-auth-shell',
          form: 'bold-login-form',
        },
        content: {
          headline: 'Authentic sneakers.',
        },
      },
    });
    expect(authPageDraft.statusCode).toBe(201);

    const emailDraft = await app.inject({
      method: 'POST',
      url: '/web-builder/email-configs/drafts',
      payload: {
        tenantId: 'tnt_heatkings',
        emailType: 'verify_email',
        designFamilyId: familyId,
        sections: [{ slot: 'body', variantKey: 'email-a-code-block' }],
      },
    });
    expect(emailDraft.statusCode).toBe(201);

    const releaseSet = await app.inject({
      method: 'POST',
      url: '/web-builder/release-sets',
      payload: {
        tenantId: 'tnt_heatkings',
        name: 'Launch auth refresh',
        themeVersionId: themeDraft.json().id,
        authPageVersionIds: [authPageDraft.json().id],
        emailVersionIds: [emailDraft.json().id],
      },
    });
    expect(releaseSet.statusCode).toBe(201);

    const scheduled = await app.inject({
      method: 'POST',
      url: `/web-builder/release-sets/${releaseSet.json().id}/schedule`,
      payload: {
        scheduledFor: '2026-05-01T12:00:00.000Z',
      },
    });
    expect(scheduled.statusCode).toBe(201);
    expect(scheduled.json().status).toBe('scheduled');

    const published = await app.inject({
      method: 'POST',
      url: `/web-builder/release-sets/${releaseSet.json().id}/publish`,
      payload: {},
    });
    expect(published.statusCode).toBe(201);
    expect(published.json().status).toBe('published');

    const rolledBack = await app.inject({
      method: 'POST',
      url: '/web-builder/release-sets/rollback',
      payload: {
        tenantId: 'tnt_heatkings',
        targetReleaseSetId: releaseSet.json().id,
      },
    });
    expect(rolledBack.statusCode).toBe(201);
    expect(rolledBack.json().status).toBe('published');
    expect(rolledBack.json().rolledBackFromReleaseSetId).toBe(releaseSet.json().id);

    const contract = await app.inject({
      method: 'GET',
      url: '/web-builder/editor-contract',
    });
    expect(contract.statusCode).toBe(200);
    expect(contract.json()).toMatchObject({
      previewModes: ['desktop', 'tablet', 'mobile'],
      defaultPreviewMode: 'desktop',
    });

    await app.close();
  });
});