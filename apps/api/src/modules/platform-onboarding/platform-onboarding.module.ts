import { Module, forwardRef } from '@nestjs/common';

import { EventsModule } from '../../core/events/events.module';
import { ObservabilityModule } from '../../core/observability/observability.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { ApplicationSubmissionController } from './application-submission.controller';
import { ApplicationSubmissionService } from './application-submission.service';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { SetupSessionController } from './setup-session.controller';
import { SetupSessionService } from './setup-session.service';
import { TenantApplicationsRepository } from './tenant-applications.repository';
import { TenantSetupInvitationsRepository } from './tenant-setup-invitations.repository';

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