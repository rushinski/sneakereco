import { Global, Module, forwardRef } from '@nestjs/common';

import { CacheModule } from '../cache/cache.module';
import { ConfigModule } from '../config/config.module';
import { ObservabilityModule } from '../observability/observability.module';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { SecurityService } from './security.service';
import { TrustedHostService } from './trusted-host.service';

@Global()
@Module({
  imports: [ConfigModule, CacheModule, forwardRef(() => ObservabilityModule)],
  providers: [
    SecurityService,
    TrustedHostService,
    AuthRateLimitGuard,
  ],
  exports: [SecurityService, TrustedHostService, AuthRateLimitGuard],
})
export class SecurityModule {}