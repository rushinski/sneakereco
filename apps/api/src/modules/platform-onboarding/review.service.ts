import { Injectable, NotFoundException } from '@nestjs/common';

import { OutboxDispatcherService } from '../../core/events/outbox-dispatcher.service';
import { AuthAuditService } from '../auth/shared/auth-audit.service';
import { TenantApplicationsRepository } from './tenant-applications.repository';

@Injectable()
export class ReviewService {
  constructor(
    private readonly tenantApplicationsRepository: TenantApplicationsRepository,
    private readonly outboxDispatcherService: OutboxDispatcherService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async approve(applicationId: string, reviewedByAdminUserId: string) {
    const application = await this.tenantApplicationsRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Tenant application not found');
    }

    const reviewedAt = new Date().toISOString();
    const updated = await this.tenantApplicationsRepository.update(applicationId, {
      status: 'approved',
      reviewedByAdminUserId,
      reviewedAt,
    });

    await this.outboxDispatcherService.enqueue({
      id: `evt_${applicationId}_approved`,
      name: 'tenant.application.approved',
      aggregateType: 'tenant_application',
      aggregateId: applicationId,
      occurredAt: reviewedAt,
      payload: {
        applicationId,
      },
    });

    this.authAuditService.record('tenant.application.reviewed', {
      applicationId,
      decision: 'approved',
      reviewedByAdminUserId,
    });

    return updated;
  }

  async deny(applicationId: string, input: { reviewedByAdminUserId: string; denialReason: string }) {
    const application = await this.tenantApplicationsRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Tenant application not found');
    }

    const updated = await this.tenantApplicationsRepository.update(applicationId, {
      status: 'denied',
      reviewedByAdminUserId: input.reviewedByAdminUserId,
      reviewedAt: new Date().toISOString(),
      denialReason: input.denialReason,
    });
    this.authAuditService.record('tenant.application.reviewed', {
      applicationId,
      decision: 'denied',
      reviewedByAdminUserId: input.reviewedByAdminUserId,
    });

    await this.outboxDispatcherService.enqueue({
      id: `evt_${applicationId}_denied_email`,
      name: 'tenant.application.denied_email.requested',
      aggregateType: 'tenant_application',
      aggregateId: applicationId,
      occurredAt: new Date().toISOString(),
      payload: {
        applicationId,
        requestedByName: application.requestedByName,
        requestedByEmail: application.requestedByEmail,
        businessName: application.businessName,
        denialReason: input.denialReason,
      },
    });

    return updated;
  }
}