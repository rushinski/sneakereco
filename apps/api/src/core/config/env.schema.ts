import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  BASE_DOMAIN: z.string().min(1),
  API_BASE_URL: z.string().url(),
  PLATFORM_URL: z.string().url(),
  PLATFORM_DASHBOARD_URL: z.string().url(),
  STATIC_ALLOWED_ORIGINS: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  DATABASE_SYSTEM_URL: z.string().min(1),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),

  VALKEY_URL: z.string().min(1),
  QUEUE_PREFIX: z.string().default('sneakereco'),

  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),

  COGNITO_ADMIN_USER_POOL_ID: z.string().min(1),
  COGNITO_PLATFORM_ADMIN_CLIENT_ID: z.string().min(1),
  COGNITO_TENANT_ADMIN_CLIENT_ID: z.string().min(1),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  ADMIN_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  CUSTOMER_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),
  AUTH_CHALLENGE_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(600),

  CSRF_SECRET: z.string().min(32),
  SESSION_SIGNING_SECRET: z.string().min(32),

  MAIL_TRANSPORT: z.enum(['smtp', 'ses']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  PLATFORM_FROM_EMAIL: z.string().email(),
  PLATFORM_FROM_NAME: z.string().min(1),
  PLATFORM_ADMIN_EMAIL: z.string().email(),
  SES_IDENTITY_ARN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;