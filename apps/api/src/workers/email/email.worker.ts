import { Injectable } from '@nestjs/common';

import { OutboxDispatcherService } from '../../core/events/outbox-dispatcher.service';
import { OutboxRepository } from '../../core/events/outbox.repository';
import { AuthEmailService } from '../../modules/communications/auth-email.service';

@Injectable()
export class EmailWorker {
  constructor(
    private readonly outboxDispatcherService: OutboxDispatcherService,
    private readonly outboxRepository: OutboxRepository,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async drain() {
    const pending = await this.outboxDispatcherService.listPending();

    for (const event of pending) {
      if (event.name !== 'tenant.setup.email.requested') {
        continue;
      }

      try {
        await this.authEmailService.sendSetupInvitation({
          tenantId: String(event.payload.tenantId),
          toEmail: String(event.payload.email),
          invitationToken: String(event.payload.invitationToken),
        });
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