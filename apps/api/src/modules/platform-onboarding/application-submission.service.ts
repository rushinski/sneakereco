import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../auth/shared/auth-audit.service';
import { TenantApplicationsRepository } from './tenant-applications.repository';

@Injectable()
export class ApplicationSubmissionService {
  constructor(
    private readonly tenantApplicationsRepository: TenantApplicationsRepository,
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
    return application;
  }
}