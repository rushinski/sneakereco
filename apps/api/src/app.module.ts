import { Module } from '@nestjs/common';

import { CacheModule } from './core/cache/cache.module';
import { ConfigModule } from './core/config/config.module';
import { CognitoModule } from './core/cognito/cognito.module';
import { DatabaseModule } from './core/database/database.module';
import { EventsModule } from './core/events/events.module';
import { ObservabilityModule } from './core/observability/observability.module';
import { QueueModule } from './core/queue/queue.module';
import { AdminAccessModule } from './modules/admin-access/admin-access.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { PlatformOnboardingModule } from './modules/platform-onboarding/platform-onboarding.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { WebBuilderModule } from './modules/web-builder/web-builder.module';

@Module({
  imports: [
    ConfigModule,
    ObservabilityModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    EventsModule,
    CognitoModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    PlatformOnboardingModule,
    AdminAccessModule,
    WebBuilderModule,
    CommunicationsModule,
    AuditModule,
  ],
})
export class AppModule {}