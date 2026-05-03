import { Injectable } from '@nestjs/common';

import { OutboxDispatcherService } from '../../core/events/outbox-dispatcher.service';
import { OutboxRepository } from '../../core/events/outbox.repository';
import { AuthEmailService } from '../../modules/communications/auth-email/auth-email.service';
import { PlatformOnboardingEmailService } from '../../modules/communications/onboarding-email/platform-onboarding-email.service';

@Injectable()
export class EmailWorker {
  constructor(
    private readonly outboxDispatcherService: OutboxDispatcherService,
    private readonly outboxRepository: OutboxRepository,
    private readonly authEmailService: AuthEmailService,
    private readonly platformOnboardingEmailService: PlatformOnboardingEmailService,
  ) {}

  async drain() {
    const pending = await this.outboxDispatcherService.listPending();

    for (const event of pending) {
      try {
        if (event.name === 'tenant.setup.email.requested') {
          await this.authEmailService.sendSetupInvitation({
            tenantId: String(event.payload.tenantId),
            toEmail: String(event.payload.email),
            invitationToken: String(event.payload.invitationToken),
          });
        } else if (event.name === 'tenant.application.submission_email.requested') {
          await this.platformOnboardingEmailService.sendSubmissionNotifications({
            requestedByName: String(event.payload.requestedByName),
            requestedByEmail: String(event.payload.requestedByEmail),
            businessName: String(event.payload.businessName),
            instagramHandle:
              typeof event.payload.instagramHandle === 'string'
                ? event.payload.instagramHandle
                : undefined,
          });
        } else if (event.name === 'tenant.application.denied_email.requested') {
          await this.platformOnboardingEmailService.sendDeniedNotification({
            requestedByName: String(event.payload.requestedByName),
            requestedByEmail: String(event.payload.requestedByEmail),
            businessName: String(event.payload.businessName),
            denialReason: String(event.payload.denialReason),
          });
        } else if (event.name === 'tenant.application.approved') {
          await this.platformOnboardingEmailService.sendApprovedNotification({
            requestedByName: String(event.payload.requestedByName),
            requestedByEmail: String(event.payload.requestedByEmail),
            businessName: String(event.payload.businessName),
            setupUrl: String(event.payload.setupUrl ?? ''),
          });
        } else {
          continue;
        }

        await this.outboxRepository.markDispatched(event.id);
      } catch (error) {
        await this.outboxRepository.markFailed(
          event.id,
          error instanceof Error ? error.message : 'unknown_error',
        );
      }
    }
  }
}
