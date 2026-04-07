import { z } from 'zod';

export const envSchema = z.object({
  // --- Application ---
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // --- Database ---
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DATABASE_SYSTEM_URL: z.string().url('DATABASE_SYSTEM_URL must be a valid PostgreSQL connection string'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // --- Valkey (Redis) ---
  VALKEY_URL: z.string().min(1, 'VALKEY_URL is required'),

  // --- AWS Region ---
  // Credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are NOT declared here.
  // The AWS SDK resolves them automatically via its default credential chain:
  // environment variables → ~/.aws/credentials → IAM instance profile.
  // Declaring them in our config would couple us to one auth method and break IAM roles.
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),

  // --- AWS Cognito ---
  COGNITO_USER_POOL_ID: z.string().min(1, 'COGNITO_USER_POOL_ID is required'),
  COGNITO_CUSTOMER_CLIENT_ID: z.string().min(1, 'COGNITO_CUSTOMER_CLIENT_ID is required'),
  COGNITO_ADMIN_CLIENT_ID: z.string().min(1, 'COGNITO_ADMIN_CLIENT_ID is required'),

  // --- Email Transport ---
  // MAIL_TRANSPORT=smtp uses nodemailer SMTP (local dev via Mailpit/MailHog)
  // MAIL_TRANSPORT=ses uses nodemailer with @aws-sdk/client-ses (staging/production)
  MAIL_TRANSPORT: z.enum(['smtp', 'ses']).default('ses'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  // --- Platform Email ---
  PLATFORM_FROM_EMAIL: z.string().email('PLATFORM_FROM_EMAIL must be a valid email'),
  PLATFORM_FROM_NAME: z.string().default('SneakerEco'),
  PLATFORM_ADMIN_EMAIL: z.string().email('PLATFORM_ADMIN_EMAIL must be a valid email'),

  // --- Platform URLs ---
  PLATFORM_URL: z.string().url('PLATFORM_URL must be a valid URL'),

  // --- Cloudflare R2 (optional until storage module is built) ---
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // --- Cloudflare API (optional until domains module is built) ---
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
