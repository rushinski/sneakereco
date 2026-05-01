import { Module, forwardRef } from '@nestjs/common';

import { EventsModule } from '../../core/events/events.module';
import { ObservabilityModule } from '../../core/observability/observability.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { ApplicationSubmissionController } from './application-submission/application-submission.controller';
import { ApplicationSubmissionService } from './application-submission/application-submission.service';
import { TenantApplicationsRepository } from './applications/tenant-applications.repository';
import { TenantSetupInvitationsRepository } from './invitations/tenant-setup-invitations.repository';
import { ReviewController } from './review/review.controller';
import { ReviewService } from './review/review.service';
import { SetupSessionController } from './setup-session/setup-session.controller';
import { SetupSessionService } from './setup-session/setup-session.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => TenantsModule), EventsModule, ObservabilityModule],
  controllers: [ApplicationSubmissionController, ReviewController, SetupSessionController],
  providers: [
    ApplicationSubmissionService,
    ReviewService,
    SetupSessionService,
    TenantApplicationsRepository,
    TenantSetupInvitationsRepository,
  ],
  exports: [TenantApplicationsRepository, TenantSetupInvitationsRepository, SetupSessionService],
})
export class PlatformOnboardingModule {}
