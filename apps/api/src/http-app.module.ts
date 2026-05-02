import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { HealthModule } from './core/observability/health/health.module';
import { ObservabilityModule } from './core/observability/observability.module';
import { AuthRateLimitGuard } from './core/security/auth-rate-limit.guard';
import { SecurityModule } from './core/security/security.module';

@Module({
  imports: [AppModule, ObservabilityModule, SecurityModule, HealthModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useExisting: AuthRateLimitGuard,
    },
  ],
})
export class HttpAppModule {}