import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';

import { EventsModule } from '../../../../src/core/events/events.module';
import { OutboxDispatcherService } from '../../../../src/core/events/outbox-dispatcher.service';
import { OutboxRepository } from '../../../../src/core/events/outbox.repository';
import { SentEmailRepository } from '../../../../src/core/email/sent-email.repository';
import { ObservabilityModule } from '../../../../src/core/observability/observability.module';
import { AuthModule } from '../../../../src/modules/auth/auth.module';
import { AuthSessionRepository } from '../../../../src/modules/auth/session-control/auth-session.repository';
import { CommunicationsModule } from '../../../../src/modules/communications/communications.module';
import { TenantBusinessProfileRepository } from '../../../../src/modules/tenants/tenant-business-profile/tenant-business-profile.repository';
import { TenantDomainConfigRepository } from '../../../../src/modules/tenants/tenant-domain/tenant-domain-config.repository';
import { TenantRepository } from '../../../../src/modules/tenants/tenant-lifecycle/tenant.repository';
import { WebBuilderModule } from '../../../../src/modules/web-builder/web-builder.module';
import { DesignFamilyRegistryRepository } from '../../../../src/modules/web-builder/design-family-registry.repository';
import { EmailDraftsRepository } from '../../../../src/modules/web-builder/email-drafts.repository';
import { ReleaseSetsRepository } from '../../../../src/modules/web-builder/release-sets.repository';
import { EmailWorker } from '../../../../src/workers/email/email.worker';
import { TenantsModule } from '../../../../src/modules/tenants/tenants.module';

describe('Auth email flows', () => {
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
      imports: [
        ObservabilityModule,
        EventsModule,
        AuthModule,
        TenantsModule,
        WebBuilderModule,
        CommunicationsModule,
      ],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return {
      app,
      tenantRepository: app.get(TenantRepository),
      tenantBusinessProfileRepository: app.get(TenantBusinessProfileRepository),
      tenantDomainConfigRepository: app.get(TenantDomainConfigRepository),
      designFamilyRegistryRepository: app.get(DesignFamilyRegistryRepository),
      emailDraftsRepository: app.get(EmailDraftsRepository),
      releaseSetsRepository: app.get(ReleaseSetsRepository),
      outboxDispatcherService: app.get(OutboxDispatcherService),
      outboxRepository: app.get(OutboxRepository),
      authSessionRepository: app.get(AuthSessionRepository),
      sentEmailRepository: app.get(SentEmailRepository),
      emailWorker: app.get(EmailWorker),
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

  it('previews the published auth email family with verification fixture data', async () => {
    const {
      app,
      tenantRepository,
      tenantBusinessProfileRepository,
      tenantDomainConfigRepository,
      designFamilyRegistryRepository,
      emailDraftsRepository,
      releaseSetsRepository,
    } = await createApp();

    const tenant = await tenantRepository.create({
      name: 'Heat Kings',
      slug: 'heat-kings',
      email: 'owner@heatkings.com',
      status: 'active',
    });
    await tenantBusinessProfileRepository.create({
      tenantId: tenant.id,
      businessName: 'Heat Kings',
      contactEmail: 'support@heatkings.com',
    });
    await tenantDomainConfigRepository.create({
      tenantId: tenant.id,
      subdomain: 'heat-kings.sneakereco.com',
      storefrontReadinessState: 'not_configured',
      adminReadinessState: 'not_configured',
    });

    const family = await designFamilyRegistryRepository.findByKey('auth-family-b');
    const emailDraft = await emailDraftsRepository.save({
      tenantId: tenant.id,
      emailType: 'verify_email',
      designFamilyId: String(family?.id),
      sections: [{ slot: 'body', variantKey: 'email-b-code-block' }],
    });
    const releaseSet = await releaseSetsRepository.create({
      tenantId: tenant.id,
      name: 'Launch',
      themeVersionId: 'thv_launch',
      authPageVersionIds: [],
      emailVersionIds: [emailDraft.id],
    });
    await releaseSetsRepository.update(releaseSet.id, { status: 'published' });

    const response = await app.inject({
      method: 'POST',
      url: '/communications/auth-emails/preview',
      payload: {
        tenantId: tenant.id,
        emailType: 'verify_email',
        stateKey: 'verification_code',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      subject: 'Confirm your Heat Kings account',
      sender: {
        fromEmail: 'auth@heat-kings.sneakereco.com',
        readinessState: 'managed_subdomain_ready',
      },
      templateVariant: {
        designFamilyKey: 'auth-family-b',
      },
    });
    expect(response.json().html).toContain('179157');

    await app.close();
  });

  it('sends a guarded test email and falls back to the managed sender when the custom domain is not ready', async () => {
    const {
      app,
      tenantRepository,
      tenantBusinessProfileRepository,
      tenantDomainConfigRepository,
      authSessionRepository,
      sentEmailRepository,
    } = await createApp();

    const tenant = await tenantRepository.create({
      name: 'Heat Kings',
      slug: 'heat-kings',
      email: 'owner@heatkings.com',
      status: 'active',
    });
    await tenantBusinessProfileRepository.create({
      tenantId: tenant.id,
      businessName: 'Heat Kings',
      contactEmail: 'support@heatkings.com',
    });
    await tenantDomainConfigRepository.create({
      tenantId: tenant.id,
      subdomain: 'heat-kings.sneakereco.com',
      storefrontCustomDomain: 'heatkings.com',
      storefrontReadinessState: 'pending_dns',
      adminReadinessState: 'not_configured',
    });
    const session = await authSessionRepository.create({
      actorType: 'tenant_admin',
      tenantId: tenant.id,
      userPoolId: 'pool-1',
      appClientId: 'tenant-client',
      cognitoSub: 'tenant-admin-sub',
      deviceId: 'browser-main',
      sessionVersion: '1',
      refreshTokenFingerprint: 'fingerprint',
      originJti: 'origin_jti',
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/communications/auth-emails/test-send',
      headers: principalHeaders({
        sub: 'tenant-admin-sub',
        iss: 'pool-1',
        client_id: 'tenant-client',
        'cognito:groups': ['tenant_admin'],
        'custom:admin_type': 'tenant_admin',
        'custom:tenant_id': tenant.id,
        'custom:session_id': session.id,
        'custom:session_version': '1',
      }),
      payload: {
        tenantId: tenant.id,
        toEmail: 'preview@heatkings.com',
        emailType: 'login_otp',
        stateKey: 'login_otp_code',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: 'sent',
      sender: {
        fromEmail: 'auth@heat-kings.sneakereco.com',
        readinessState: 'managed_subdomain_ready',
      },
    });

    const latest = await sentEmailRepository.latest();
    expect(latest).toMatchObject({
      toEmail: 'preview@heatkings.com',
      subject: 'Your Heat Kings sign-in code',
      sender: {
        fromEmail: 'auth@heat-kings.sneakereco.com',
      },
    });

    await app.close();
  });

  it('drains tenant setup invitation email events through the email worker using the tenant fallback admin URL', async () => {
    const {
      app,
      tenantRepository,
      tenantBusinessProfileRepository,
      tenantDomainConfigRepository,
      outboxDispatcherService,
      outboxRepository,
      sentEmailRepository,
      emailWorker,
    } = await createApp();

    const tenant = await tenantRepository.create({
      name: 'Rare Soles',
      slug: 'rare-soles',
      email: 'owner@raresoles.com',
      status: 'setup_pending',
    });
    await tenantBusinessProfileRepository.create({
      tenantId: tenant.id,
      businessName: 'Rare Soles',
      contactEmail: 'support@raresoles.com',
    });
    await tenantDomainConfigRepository.create({
      tenantId: tenant.id,
      subdomain: 'rare-soles.sneakereco.com',
      storefrontReadinessState: 'not_configured',
      adminReadinessState: 'not_configured',
    });

    const queued = await outboxDispatcherService.enqueue({
      id: 'evt_setup_email',
      name: 'tenant.setup.email.requested',
      aggregateType: 'tenant',
      aggregateId: tenant.id,
      occurredAt: new Date().toISOString(),
      payload: {
        tenantId: tenant.id,
        email: 'owner@raresoles.com',
        invitationToken: 'setup_token',
      },
    });
    expect(queued.status).toBe('pending');

    await emailWorker.drain();

    const latest = await sentEmailRepository.latest();
    expect(latest).toMatchObject({
      toEmail: 'owner@raresoles.com',
      subject: 'Finish setting up your Rare Soles admin account',
      sender: {
        fromEmail: 'auth@rare-soles.sneakereco.com',
      },
    });
    expect(latest?.html).toContain(
      'https://rare-soles.sneakereco.com/admin/setup?token=setup_token',
    );

    const pending = await outboxRepository.listPending();
    expect(pending.find((event) => event.id === 'evt_setup_email')).toBeUndefined();

    await app.close();
  });
});
