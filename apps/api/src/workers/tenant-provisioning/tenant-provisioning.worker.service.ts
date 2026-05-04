import { Injectable } from '@nestjs/common';

import { OutboxDispatcherService } from '../../core/events/outbox-dispatcher.service';
import { OutboxRepository } from '../../core/events/outbox.repository';
import { TenantProvisioningService } from '../../modules/tenants/tenant-provisioning/provisioning.service';

@Injectable()
export class TenantProvisioningWorkerService {
  constructor(
    private readonly outboxDispatcherService: OutboxDispatcherService,
    private readonly outboxRepository: OutboxRepository,
    private readonly tenantProvisioningService: TenantProvisioningService,
  ) {}

  async drain() {
    const pending = await this.outboxDispatcherService.listPending();

    for (const event of pending) {
      if (event.name !== 'tenant.application.approved') {
        continue;
      }

      try {
        await this.tenantProvisioningService.processApprovedApplication(
          String(event.payload.applicationId),
        );
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
