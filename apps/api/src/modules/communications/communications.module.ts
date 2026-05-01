import { Module } from '@nestjs/common';

import { EmailModule } from '../../core/email/email.module';
import { EventsModule } from '../../core/events/events.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { WebBuilderModule } from '../web-builder/web-builder.module';
import { EmailWorker } from '../../workers/email/email.worker';
import { AuthEmailController } from './auth-email/auth-email.controller';
import { AuthEmailFixturesRepository } from './auth-email/auth-email-fixtures.repository';
import { AuthEmailService } from './auth-email/auth-email.service';
import { EmailAuditService } from './email-audit/email-audit.service';
import { PlatformOnboardingEmailService } from './onboarding-email/platform-onboarding-email.service';

@Module({
  imports: [EmailModule, EventsModule, AuditModule, AuthModule, TenantsModule, WebBuilderModule],
  controllers: [AuthEmailController],
  providers: [
    AuthEmailFixturesRepository,
    AuthEmailService,
    EmailAuditService,
    PlatformOnboardingEmailService,
    EmailWorker,
  ],
  exports: [
    AuthEmailService,
    AuthEmailFixturesRepository,
    EmailAuditService,
    PlatformOnboardingEmailService,
    EmailWorker,
  ],
})
export class CommunicationsModule {}
