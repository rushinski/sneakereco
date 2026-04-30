import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

import { CacheService } from '../../../src/core/cache/cache.service';
import { DatabaseService } from '../../../src/core/database/database.service';
import { HttpAppModule } from '../../../src/http-app.module';
import { QueueService } from '../../../src/core/queue/queue.service';
import { WorkerHeartbeatService } from '../../../src/core/observability/health/worker-heartbeat.service';
import { AuthSessionRepository } from '../../../src/modules/auth/shared/auth-session.repository';
import { OutboxDispatcherService } from '../../../src/core/events/outbox-dispatcher.service';
import { OutboxRepository } from '../../../src/core/events/outbox.repository';

describe('Hardening and operations', () => {
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
      SWAGGER_ENABLED: 'false',
    });
  });

  async function createApp() {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpAppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        appPool: {
          query: jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] }),
        },
      })
      .overrideProvider(CacheService)
      .useValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      })
      .overrideProvider(QueueService)
      .useValue({
        ping: jest.fn().mockResolvedValue('PONG'),
      })
      .overrideProvider(WorkerHeartbeatService)
      .useValue({
        getStatus: jest.fn().mockResolvedValue('ok'),
      })
      .compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return {
      app,
      authSessionRepository: app.get(AuthSessionRepository),
      outboxDispatcherService: app.get(OutboxDispatcherService),
      outboxRepository: app.get(OutboxRepository),
    };
  }

  function principalHeader(principal: Record<string, string | string[]>) {
    return Buffer.from(JSON.stringify(principal)).toString('base64url');
  }

  it('enforces auth route rate limits on repeated admin login attempts', async () => {
    const { app } = await createApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/admin/login',
        payload: {
          email: 'unknown@sneakereco.com',
          password: 'bad-password',
        },
      });
      expect(response.statusCode).toBe(401);
    }

    const throttled = await app.inject({
      method: 'POST',
      url: '/auth/admin/login',
      payload: {
        email: 'unknown@sneakereco.com',
        password: 'bad-password',
      },
    });
    expect(throttled.statusCode).toBe(429);

    await app.close();
  });

  it('surfaces audit events, dead letters, metrics, and health signals', async () => {
    const { app, authSessionRepository, outboxDispatcherService, outboxRepository } = await createApp();

    const session = await authSessionRepository.create({
      actorType: 'platform_admin',
      userPoolId: 'pool-1',
      appClientId: 'platform-client',
      cognitoSub: 'platform-admin-sub',
      deviceId: 'ops-browser',
      sessionVersion: '1',
      refreshTokenFingerprint: 'fingerprint',
      originJti: 'origin_jti',
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    await app.inject({
      method: 'POST',
      url: '/auth/admin/login',
      payload: {
        email: 'unknown@sneakereco.com',
        password: 'bad-password',
      },
    });

    await outboxDispatcherService.enqueue({
      id: 'evt_failed_delivery',
      name: 'tenant.setup.email.requested',
      aggregateType: 'tenant',
      aggregateId: 'tnt_demo',
      occurredAt: new Date().toISOString(),
      payload: {
        tenantId: 'tnt_demo',
        email: 'owner@demo.com',
        invitationToken: 'setup_token',
      },
    });
    await outboxRepository.markFailed('evt_failed_delivery', 'smtp_offline');

    const authHeader = principalHeader({
      sub: 'platform-admin-sub',
      iss: 'pool-1',
      client_id: 'platform-client',
      'cognito:groups': ['platform_admin'],
      'custom:admin_type': 'platform_admin',
      'custom:session_id': session.id,
      'custom:session_version': '1',
    });

    const auditEvents = await app.inject({
      method: 'GET',
      url: '/audit/events?eventName=auth.admin.login.failed',
      headers: {
        'x-auth-principal': authHeader,
      },
    });
    expect(auditEvents.statusCode).toBe(200);
    expect(auditEvents.json()[0]).toMatchObject({
      eventName: 'auth.admin.login.failed',
    });

    const deadLetters = await app.inject({
      method: 'GET',
      url: '/audit/dead-letters',
      headers: {
        'x-auth-principal': authHeader,
      },
    });
    expect(deadLetters.statusCode).toBe(200);
    expect(deadLetters.json()[0]).toMatchObject({
      id: 'evt_failed_delivery',
      failureReason: 'smtp_offline',
    });

    const replay = await app.inject({
      method: 'POST',
      url: '/audit/dead-letters/evt_failed_delivery/replay',
      headers: {
        'x-auth-principal': authHeader,
      },
    });
    expect(replay.statusCode).toBe(201);
    expect(replay.json()).toMatchObject({
      id: 'evt_failed_delivery',
      status: 'pending',
    });

    const health = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      status: 'ok',
      backlogs: {
        outboxPending: 1,
      },
    });

    const metrics = await app.inject({
      method: 'GET',
      url: '/metrics',
    });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json()).toMatchObject({
      counters: {
        'auth.failures': expect.any(Number),
        'auth.suspicious_signals': expect.any(Number),
      },
      gauges: {
        'outbox.pending': expect.any(Number),
      },
    });

    await app.close();
  });
});