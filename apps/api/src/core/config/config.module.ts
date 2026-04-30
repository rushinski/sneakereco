import { Global, Module } from '@nestjs/common';

import { getAuthConfig } from './auth.config';
import { getDomainConfig } from './domain.config';
import { envSchema } from './env.schema';

export const ENVIRONMENT = Symbol('ENVIRONMENT');
export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
export const DOMAIN_CONFIG = Symbol('DOMAIN_CONFIG');

@Global()
@Module({
  providers: [
    {
      provide: ENVIRONMENT,
      useFactory: () => envSchema.parse(process.env),
    },
    {
      provide: AUTH_CONFIG,
      useFactory: () => getAuthConfig(process.env),
    },
    {
      provide: DOMAIN_CONFIG,
      useFactory: () => getDomainConfig(process.env),
    },
  ],
  exports: [ENVIRONMENT, AUTH_CONFIG, DOMAIN_CONFIG],
})
export class ConfigModule {}