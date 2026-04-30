import { envSchema } from '../../../../src/core/config/env.schema';

describe('envSchema', () => {
  it('requires the renamed shared admin pool variable and core auth settings', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'debug',
      BASE_DOMAIN: 'sneakereco.test',
      API_BASE_URL: 'https://api.sneakereco.test',
      PLATFORM_URL: 'https://sneakereco.test',
      PLATFORM_DASHBOARD_URL: 'https://dashboard.sneakereco.test',
      DATABASE_URL: 'postgresql://app:pass@localhost:5432/db',
      DATABASE_SYSTEM_URL: 'postgresql://sys:pass@localhost:5432/db',
      DATABASE_POOL_MIN: '2',
      DATABASE_POOL_MAX: '20',
      VALKEY_URL: 'redis://localhost:6379',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      COGNITO_PLATFORM_ADMIN_CLIENT_ID: 'platform-client',
      COGNITO_TENANT_ADMIN_CLIENT_ID: 'tenant-client',
      ACCESS_TOKEN_TTL_SECONDS: '1800',
      ADMIN_REFRESH_TOKEN_TTL_SECONDS: '86400',
      CUSTOMER_REFRESH_TOKEN_TTL_SECONDS: '2592000',
      AUTH_CHALLENGE_SESSION_TTL_SECONDS: '600',
      CSRF_SECRET: 'a'.repeat(32),
      SESSION_SIGNING_SECRET: 'b'.repeat(32),
      MAIL_TRANSPORT: 'smtp',
      PLATFORM_FROM_EMAIL: 'noreply@sneakereco.com',
      PLATFORM_FROM_NAME: 'SneakerEco',
      PLATFORM_ADMIN_EMAIL: 'admin@sneakereco.com',
      OPS_API_TOKEN: 'ops-token-test-value',
    });

    expect(result.success).toBe(false);
  });

  it('parses a valid environment contract', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'debug',
      REQUEST_ID_HEADER: 'x-request-id',
      CORRELATION_ID_HEADER: 'x-correlation-id',
      BASE_DOMAIN: 'sneakereco.test',
      API_BASE_URL: 'https://api.sneakereco.test',
      PLATFORM_URL: 'https://sneakereco.test',
      PLATFORM_DASHBOARD_URL: 'https://dashboard.sneakereco.test',
      STATIC_ALLOWED_ORIGINS: 'https://sneakereco.test,https://dashboard.sneakereco.test',
      SWAGGER_ENABLED: 'true',
      SWAGGER_PATH: 'docs',
      DATABASE_URL: 'postgresql://app:pass@localhost:5432/db',
      DATABASE_SYSTEM_URL: 'postgresql://sys:pass@localhost:5432/db',
      DATABASE_POOL_MIN: '2',
      DATABASE_POOL_MAX: '20',
      VALKEY_URL: 'redis://localhost:6379',
      QUEUE_PREFIX: 'sneakereco',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      COGNITO_ADMIN_USER_POOL_ID: 'us-east-1_test',
      COGNITO_PLATFORM_ADMIN_CLIENT_ID: 'platform-client',
      COGNITO_TENANT_ADMIN_CLIENT_ID: 'tenant-client',
      ACCESS_TOKEN_TTL_SECONDS: '1800',
      ADMIN_REFRESH_TOKEN_TTL_SECONDS: '86400',
      CUSTOMER_REFRESH_TOKEN_TTL_SECONDS: '2592000',
      AUTH_CHALLENGE_SESSION_TTL_SECONDS: '600',
      CSRF_SECRET: 'a'.repeat(32),
      SESSION_SIGNING_SECRET: 'b'.repeat(32),
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      PLATFORM_FROM_EMAIL: 'noreply@sneakereco.com',
      PLATFORM_FROM_NAME: 'SneakerEco',
      PLATFORM_ADMIN_EMAIL: 'admin@sneakereco.com',
      OPS_API_TOKEN: 'ops-token-test-value',
    });

    expect(result.COGNITO_ADMIN_USER_POOL_ID).toBe('us-east-1_test');
    expect(result.PORT).toBe(3000);
    expect(result.SWAGGER_ENABLED).toBe(true);
  });
});