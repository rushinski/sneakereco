import { Module } from '@nestjs/common';

import { AppModule } from './app.module';
import { HealthModule } from './core/observability/health/health.module';
import { ObservabilityModule } from './core/observability/observability.module';
import { SecurityModule } from './core/security/security.module';

@Module({
  imports: [AppModule, ObservabilityModule, SecurityModule, HealthModule],
})
export class HttpAppModule {}