import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../auth/shared/auth-audit.service';
import { OutboxDispatcherService } from '../../core/events/outbox-dispatcher.service';
import { TenantApplicationsRepository } from './tenant-applications.repository';

@Injectable()
export class ApplicationSubmissionService {
  constructor(
    private readonly tenantApplicationsRepository: TenantApplicationsRepository,
    private readonly outboxDispatcherService: OutboxDispatcherService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async submit(input: {
    requestedByName: string;
    requestedByEmail: string;
    businessName: string;
    instagramHandle?: string;
  }) {
    const application = await this.tenantApplicationsRepository.create({
      ...input,
      status: 'submitted',
    });
    this.authAuditService.record('tenant.application.submitted', {
      applicationId: application.id,
      email: application.requestedByEmail,
    });

    await this.outboxDispatcherService.enqueue({
      id: `evt_${application.id}_submission_email`,
      name: 'tenant.application.submission_email.requested',
      aggregateType: 'tenant_application',
      aggregateId: application.id,
      occurredAt: new Date().toISOString(),
      payload: {
        applicationId: application.id,
        requestedByName: application.requestedByName,
        requestedByEmail: application.requestedByEmail,
        businessName: application.businessName,
        instagramHandle: application.instagramHandle,
      },
    });
    return application;
  }
}