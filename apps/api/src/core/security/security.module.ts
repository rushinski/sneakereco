import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { SecurityService } from './security.service';

@Global()
@Module({
  providers: [
    SecurityService,
    AuthRateLimitGuard,
    {
      provide: APP_GUARD,
      useExisting: AuthRateLimitGuard,
    },
  ],
  exports: [SecurityService],
})
export class SecurityModule {}