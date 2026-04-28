import { z } from 'zod';

export const envSchema = z.object({
  // --- Application ---
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- Database ---
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DATABASE_SYSTEM_URL: z
    .string()
    .url('DATABASE_SYSTEM_URL must be a valid PostgreSQL connection string'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),

  // --- Valkey ---
  VALKEY_URL: z.string().min(1, 'VALKEY_URL is required'),

  // --- AWS ---
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),

  // --- AWS Cognito ---
  // Shared admin pool — manually created, used by both platform admins and tenant admins.
  COGNITO_POOL_ID: z.string().min(1, 'COGNITO_POOL_ID is required'),
  COGNITO_PLATFORM_ADMIN_CLIENT_ID: z
    .string()
    .min(1, 'COGNITO_PLATFORM_ADMIN_CLIENT_ID is required'),
  COGNITO_TENANT_ADMIN_CLIENT_ID: z.string().min(1, 'COGNITO_TENANT_ADMIN_CLIENT_ID is required'),

  // --- Email ---
  MAIL_TRANSPORT: z.enum(['smtp', 'ses']).default('ses'),
  PLATFORM_FROM_EMAIL: z.string().email('PLATFORM_FROM_EMAIL must be a valid email'),
  PLATFORM_FROM_NAME: z.string().default('SneakerEco'),
  PLATFORM_ADMIN_EMAIL: z.string().email('PLATFORM_ADMIN_EMAIL must be a valid email'),
  // ARN of the SES verified domain identity for sneakereco.com.
  // Required in staging/production to send tenant-branded emails via SES.
  // Not required in development (MAIL_TRANSPORT=smtp bypasses SES).
  SES_IDENTITY_ARN: z.string().min(1).optional(),

  // --- URLs ---
  // Public-facing URL of the platform site (sneakereco.com). Used for CORS and invite links.
  PLATFORM_URL: z.string().url('PLATFORM_URL must be a valid URL'),
  // Public-facing URL of the platform admin dashboard (dashboard.sneakereco.com). Added to CORS allowlist.
  PLATFORM_DASHBOARD_URL: z.string().url('PLATFORM_DASHBOARD_URL must be a valid URL').optional(),

  // --- CSRF ---
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
});

export type Env = z.infer<typeof envSchema>;
