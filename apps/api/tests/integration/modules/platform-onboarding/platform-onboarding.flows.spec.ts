import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

import { EventsModule } from '../../../../src/core/events/events.module';
import { OutboxDispatcherService } from '../../../../src/core/events/outbox-dispatcher.service';
import { ObservabilityModule } from '../../../../src/core/observability/observability.module';
import { AuthModule } from '../../../../src/modules/auth/auth.module';
import { PlatformOnboardingModule } from '../../../../src/modules/platform-onboarding/platform-onboarding.module';
import { TenantApplicationsRepository } from '../../../../src/modules/platform-onboarding/tenant-applications.repository';
import { TenantSetupInvitationsRepository } from '../../../../src/modules/platform-onboarding/tenant-setup-invitations.repository';
import { CommunicationsModule } from '../../../../src/modules/communications/communications.module';
import { TenantsModule } from '../../../../src/modules/tenants/tenants.module';
import { AdminTenantRelationshipsRepository } from '../../../../src/modules/tenants/admin-tenant-relationships.repository';
import { TenantBusinessProfileRepository } from '../../../../src/modules/tenants/tenant-business-profile.repository';
import { TenantCognitoConfigRepository } from '../../../../src/modules/tenants/tenant-cognito-config.repository';
import { TenantDomainConfigRepository } from '../../../../src/modules/tenants/tenant-domain-config.repository';
import { TenantProvisioningGateway } from '../../../../src/modules/tenants/tenant-provisioning.gateway';
import { TenantRepository } from '../../../../src/modules/tenants/tenant.repository';
import { SentEmailRepository } from '../../../../src/core/email/sent-email.repository';
import { EmailWorker } from '../../../../src/workers/email/email.worker';
import { TenantProvisioningWorkerService } from '../../../../src/workers/tenant-provisioning/tenant-provisioning.worker.service';
import { WebBuilderModule } from '../../../../src/modules/web-builder/web-builder.module';
import { CognitoAuthGateway } from '../../../../src/modules/auth/shared/cognito-auth.gateway';
import { AdminUsersRepository } from '../../../../src/modules/auth/shared/admin-users.repository';

describe('Platform onboarding flows', () => {
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

  async function createApp(options?: { failProvisioning?: boolean }) {
    const gateway = {
      createCustomerPoolAndClient: jest.fn().mockImplementation(async ({ tenantId, slug }) => {
        if (options?.failProvisioning) {
          throw new Error('customer_pool_failed');
        }

        return {
          userPoolId: `pool_${tenantId}`,
          userPoolArn: `arn:aws:cognito-idp:us-east-1:local:userpool/pool_${tenantId}`,
          userPoolName: `${slug}-customers`,
          customerClientId: `client_${tenantId}`,
          customerClientName: `${slug}-customers-web`,
          region: 'us-east-1',
        };
      }),
      createTenantAdminIdentity: jest.fn().mockResolvedValue({
        cognitoSub: 'tenant-admin-sub',
      }),
    };
    const cognitoAuthGateway = {
      beginAdminSetup: jest.fn().mockResolvedValue({
        totpSecret: 'JBSWY3DPEHPK3PXP',
        otpauthUri:
          'otpauth://totp/SneakerEco%20Admin:owner%40heatkings.com?secret=JBSWY3DPEHPK3PXP&issuer=SneakerEco%20Admin',
        challengeSessionToken: 'setup-challenge-token',
      }),
      completeAdminSetup: jest.fn().mockResolvedValue({
        actorType: 'tenant_admin',
        cognitoSub: 'tenant-admin-sub',
        userPoolId: 'pool-1',
        appClientId: 'tenant-client',
        groups: ['tenant_admin'],
        email: 'owner@heatkings.com',
        tenantId: 'tnt_heatkings',
        accessToken: 'tenant-admin-access-token',
        refreshToken: 'tenant-admin-refresh-token',
        originJti: 'tenant-admin-origin-jti',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ObservabilityModule,
        EventsModule,
        AuthModule,
        TenantsModule,
        WebBuilderModule,
        CommunicationsModule,
        PlatformOnboardingModule,
      ],
    })
      .overrideProvider(TenantProvisioningGateway)
      .useValue(gateway)
      .overrideProvider(CognitoAuthGateway)
      .useValue(cognitoAuthGateway)
      .compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return {
      app,
      gateway,
      applicationsRepository: app.get(TenantApplicationsRepository),
      tenantRepository: app.get(TenantRepository),
      adminUsersRepository: app.get(AdminUsersRepository),
      businessProfilesRepository: app.get(TenantBusinessProfileRepository),
      domainConfigRepository: app.get(TenantDomainConfigRepository),
      cognitoConfigRepository: app.get(TenantCognitoConfigRepository),
      adminTenantRelationshipsRepository: app.get(AdminTenantRelationshipsRepository),
      setupInvitationsRepository: app.get(TenantSetupInvitationsRepository),
      outboxDispatcherService: app.get(OutboxDispatcherService),
      sentEmailRepository: app.get(SentEmailRepository),
      emailWorker: app.get(EmailWorker),
      worker: app.get(TenantProvisioningWorkerService),
      cognitoAuthGateway,
    };
  }

  it('submits an application, approves it, and provisions the tenant asynchronously', async () => {
    const {
      app,
      applicationsRepository,
      tenantRepository,
      businessProfilesRepository,
      domainConfigRepository,
      cognitoConfigRepository,
      adminTenantRelationshipsRepository,
      setupInvitationsRepository,
      outboxDispatcherService,
      worker,
    } = await createApp();

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/applications',
      payload: {
        requestedByName: 'Heat Kings Owner',
        requestedByEmail: 'owner@heatkings.com',
        businessName: 'Heat Kings',
        instagramHandle: '@heatkings',
      },
    });
    expect(submitResponse.statusCode).toBe(201);
    const application = submitResponse.json();

    const approveResponse = await app.inject({
      method: 'POST',
      url: `/platform/onboarding/applications/${application.id}/approve`,
      payload: {
        reviewedByAdminUserId: 'adm_platform_owner',
      },
    });
    expect(approveResponse.statusCode).toBe(201);

    await worker.drain();

    const approvedApplication = await applicationsRepository.findById(application.id);
    expect(approvedApplication?.status).toBe('approved');
    expect(approvedApplication?.approvedTenantId).toMatch(/^tnt_/);

    const tenant = await tenantRepository.findById(String(approvedApplication?.approvedTenantId));
    expect(tenant?.status).toBe('setup_pending');
    expect(tenant?.slug).toBe('heat-kings');

    expect(await businessProfilesRepository.findByTenantId(String(tenant?.id))).toMatchObject({
      businessName: 'Heat Kings',
      contactEmail: 'owner@heatkings.com',
    });
    expect(await domainConfigRepository.findByTenantId(String(tenant?.id))).toMatchObject({
      subdomain: 'heat-kings.sneakereco.test',
      storefrontReadinessState: 'not_configured',
      adminReadinessState: 'not_configured',
    });
    expect(await cognitoConfigRepository.findByTenantId(String(tenant?.id))).toMatchObject({
      provisioningStatus: 'ready',
      userPoolName: 'heat-kings-customers',
    });
    expect(await adminTenantRelationshipsRepository.findActiveByTenantId(String(tenant?.id))).toMatchObject({
      relationshipType: 'tenant_admin',
      status: 'active',
    });
    expect(await setupInvitationsRepository.findByTenantId(String(tenant?.id))).toMatchObject({
      status: 'issued',
    });

    const pendingEvents = await outboxDispatcherService.listPending();
    expect(pendingEvents.find((event) => event.name === 'tenant.setup.email.requested')).toBeDefined();

    await app.close();
  });

  it('handles the deny path without queuing provisioning work', async () => {
    const { app, applicationsRepository, outboxDispatcherService, sentEmailRepository, emailWorker } =
      await createApp();

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/applications',
      payload: {
        requestedByName: 'Denied Owner',
        requestedByEmail: 'denied@example.com',
        businessName: 'Denied Shop',
      },
    });

    const application = submitResponse.json();

    const denyResponse = await app.inject({
      method: 'POST',
      url: `/platform/onboarding/applications/${application.id}/deny`,
      payload: {
        reviewedByAdminUserId: 'adm_platform_owner',
        denialReason: 'Not a fit',
      },
    });
    expect(denyResponse.statusCode).toBe(201);

    const deniedApplication = await applicationsRepository.findById(application.id);
    expect(deniedApplication).toMatchObject({
      status: 'denied',
      denialReason: 'Not a fit',
    });

    await emailWorker.drain();

    const sentEmails = await sentEmailRepository.list();
    expect(sentEmails).toHaveLength(3);
    expect(sentEmails[0]).toMatchObject({
      toEmail: 'denied@example.com',
      subject: 'We received your SneakerEco application',
    });
    expect(sentEmails[1]).toMatchObject({
      toEmail: 'admin@sneakereco.com',
      subject: 'New SneakerEco tenant application request',
    });
    expect(sentEmails[2]).toMatchObject({
      toEmail: 'denied@example.com',
      subject: 'Your SneakerEco application was not approved',
    });
    expect((await outboxDispatcherService.listPending()).length).toBe(0);
    await app.close();
  });

  it('queues submission notification emails for the requester and platform admin', async () => {
    const { app, outboxDispatcherService, sentEmailRepository, emailWorker } = await createApp();

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/applications',
      payload: {
        requestedByName: 'Request Owner',
        requestedByEmail: 'request@example.com',
        businessName: 'Request Shop',
        instagramHandle: '@requestshop',
      },
    });
    expect(submitResponse.statusCode).toBe(201);

    const pendingEvents = await outboxDispatcherService.listPending();
    expect(
      pendingEvents.filter((event) => event.name === 'tenant.application.submission_email.requested'),
    ).toHaveLength(1);

    await emailWorker.drain();

    const sentEmails = await sentEmailRepository.list();
    expect(sentEmails).toHaveLength(2);
    expect(sentEmails[0]).toMatchObject({
      toEmail: 'request@example.com',
      subject: 'We received your SneakerEco application',
    });
    expect(sentEmails[1]).toMatchObject({
      toEmail: 'admin@sneakereco.com',
      subject: 'New SneakerEco tenant application request',
    });

    await app.close();
  });

  it('marks the tenant as provisioning_failed when provisioning work throws', async () => {
    const { app, applicationsRepository, tenantRepository, worker } = await createApp({
      failProvisioning: true,
    });

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/applications',
      payload: {
        requestedByName: 'Broken Owner',
        requestedByEmail: 'broken@example.com',
        businessName: 'Broken Shop',
      },
    });
    const application = submitResponse.json();

    await app.inject({
      method: 'POST',
      url: `/platform/onboarding/applications/${application.id}/approve`,
      payload: {
        reviewedByAdminUserId: 'adm_platform_owner',
      },
    });

    await worker.drain();

    const approvedApplication = await applicationsRepository.findById(application.id);
    const tenant = await tenantRepository.findById(String(approvedApplication?.approvedTenantId));
    expect(tenant).toMatchObject({
      status: 'provisioning_failed',
      provisioningFailureReason: 'customer_pool_failed',
    });
    await app.close();
  });

  it('consumes an issued setup invitation after successful provisioning', async () => {
    const { app, applicationsRepository, outboxDispatcherService, worker } = await createApp();

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/applications',
      payload: {
        requestedByName: 'Invite Owner',
        requestedByEmail: 'invite@example.com',
        businessName: 'Invite Shop',
      },
    });
    const application = submitResponse.json();

    await app.inject({
      method: 'POST',
      url: `/platform/onboarding/applications/${application.id}/approve`,
      payload: {
        reviewedByAdminUserId: 'adm_platform_owner',
      },
    });
    await worker.drain();

    const approvedApplication = await applicationsRepository.findById(application.id);
    expect(approvedApplication?.approvedTenantId).toMatch(/^tnt_/);

    const invitationEvent = (await outboxDispatcherService.listPending()).find(
      (event) => event.name === 'tenant.setup.email.requested',
    );
    expect(invitationEvent).toBeDefined();

    const consumeResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/setup-invitations/consume',
      payload: {
        token: String(invitationEvent?.payload.invitationToken),
      },
    });
    expect(consumeResponse.statusCode).toBe(201);
    expect(consumeResponse.json()).toMatchObject({
      status: 'consumed',
      tenantId: approvedApplication?.approvedTenantId,
    });

    const consumeAgainResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/setup-invitations/consume',
      payload: {
        token: String(invitationEvent?.payload.invitationToken),
      },
    });
    expect(consumeAgainResponse.statusCode).toBe(401);
    await app.close();
  });

  
  it('completes invited tenant admin setup, activates the tenant, and issues a logged-in session', async () => {
    const {
      app,
      applicationsRepository,
      tenantRepository,
      adminUsersRepository,
      outboxDispatcherService,
      worker,
      cognitoAuthGateway,
    } = await createApp();

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/applications',
      payload: {
        requestedByName: 'Setup Owner',
        requestedByEmail: 'owner@heatkings.com',
        businessName: 'Heat Kings',
      },
    });
    const application = submitResponse.json();

    await app.inject({
      method: 'POST',
      url: `/platform/onboarding/applications/${application.id}/approve`,
      payload: {
        reviewedByAdminUserId: 'adm_platform_owner',
      },
    });
    await worker.drain();

    const invitationEvent = (await outboxDispatcherService.listPending()).find(
      (event) => event.name === 'tenant.setup.email.requested',
    );
    expect(invitationEvent).toBeDefined();

    const consumeResponse = await app.inject({
      method: 'POST',
      url: '/platform/onboarding/setup-invitations/consume',
      payload: {
        token: String(invitationEvent?.payload.invitationToken),
      },
    });
    expect(consumeResponse.statusCode).toBe(201);
    expect(consumeResponse.json().setupSessionToken).toBeDefined();

    const beginResponse = await app.inject({
      method: 'POST',
      url: '/auth/admin/setup/begin',
      payload: {
        setupSessionToken: consumeResponse.json().setupSessionToken,
        password: 'Password123!',
      },
    });
    expect(beginResponse.statusCode).toBe(201);
    expect(beginResponse.json()).toMatchObject({
      challengeSessionToken: 'setup-challenge-token',
      totpSecret: 'JBSWY3DPEHPK3PXP',
    });

    const approvedApplication = await applicationsRepository.findById(application.id);
    const completeResponse = await app.inject({
      method: 'POST',
      url: '/auth/admin/setup/complete',
      payload: {
        challengeSessionToken: beginResponse.json().challengeSessionToken,
        code: '123456',
        deviceId: 'browser-1',
      },
    });
    expect(completeResponse.statusCode).toBe(201);
    expect(completeResponse.json()).toMatchObject({
      accessToken: 'tenant-admin-access-token',
      principal: {
        actorType: 'tenant_admin',
      },
    });

    expect(cognitoAuthGateway.beginAdminSetup).toHaveBeenCalled();
    expect(cognitoAuthGateway.completeAdminSetup).toHaveBeenCalled();
    expect(await tenantRepository.findById(String(approvedApplication?.approvedTenantId))).toMatchObject({
      status: 'active',
    });

    const adminUser = await adminUsersRepository.findByEmail('owner@heatkings.com');
    expect(adminUser).toMatchObject({
      status: 'active',
    });
    await app.close();
  });
});
