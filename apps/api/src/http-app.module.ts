import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppModule } from './app.module';
import { HealthModule } from './core/observability/health/health.module';
import { ObservabilityModule } from './core/observability/observability.module';
import { AuthRateLimitGuard } from './core/security/auth-rate-limit.guard';
import { SecurityModule } from './core/security/security.module';

@Module({
  imports: [AppModule, ObservabilityModule, SecurityModule, HealthModule],
  providers: [
    {
      provide: APP_GUARD,
      useExisting: AuthRateLimitGuard,
    },
  ],
})
export class HttpAppModule {}