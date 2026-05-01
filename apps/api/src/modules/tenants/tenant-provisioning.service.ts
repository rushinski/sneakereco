import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import type { DomainConfig } from '../../core/config';
import { DOMAIN_CONFIG } from '../../core/config/config.module';
import { OutboxDispatcherService } from '../../core/events/outbox-dispatcher.service';
import { LoggerService } from '../../core/observability/logging/logger.service';
import { MetricsService } from '../../core/observability/metrics/metrics.service';
import { AuditService } from '../audit/audit.service';
import { AdminUsersRepository } from '../auth/admin-users/admin-users.repository';
import { TenantApplicationsRepository } from '../platform-onboarding/applications/tenant-applications.repository';
import { TenantSetupInvitationsRepository } from '../platform-onboarding/invitations/tenant-setup-invitations.repository';
import { AdminTenantRelationshipsRepository } from './admin-tenant-relationships.repository';
import { TenantBusinessProfileRepository } from './tenant-business-profile.repository';
import { TenantCognitoConfigRepository } from './tenant-cognito-config.repository';
import { TenantDomainConfigRepository } from './tenant-domain-config.repository';
import { TenantProvisioningGateway } from './tenant-provisioning.gateway';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class TenantProvisioningService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantBusinessProfileRepository: TenantBusinessProfileRepository,
    private readonly tenantDomainConfigRepository: TenantDomainConfigRepository,
    private readonly tenantCognitoConfigRepository: TenantCognitoConfigRepository,
    private readonly adminUsersRepository: AdminUsersRepository,
    private readonly adminTenantRelationshipsRepository: AdminTenantRelationshipsRepository,
    private readonly tenantSetupInvitationsRepository: TenantSetupInvitationsRepository,
    private readonly tenantApplicationsRepository: TenantApplicationsRepository,
    private readonly tenantProvisioningGateway: TenantProvisioningGateway,
    private readonly outboxDispatcherService: OutboxDispatcherService,
    @Inject(DOMAIN_CONFIG) private readonly domainConfig: DomainConfig,
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService,
    private readonly auditService: AuditService,
  ) {}

  async processApprovedApplication(applicationId: string) {
    const application = await this.tenantApplicationsRepository.findById(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const slug = this.toSlug(application.businessName);
    let tenant = await this.tenantRepository.findBySlug(slug);
    if (!tenant) {
      tenant = await this.tenantRepository.create({
        name: application.businessName,
        slug,
        email: application.requestedByEmail,
        status: 'provisioning',
      });
      await this.tenantApplicationsRepository.update(application.id, {
        approvedTenantId: tenant.id,
      });
    }

    try {
      await this.auditService.record({
        eventName: 'tenant.provisioning.started',
        tenantId: tenant.id,
        metadata: {
          applicationId: application.id,
        },
      });
      await this.tenantBusinessProfileRepository.create({
        tenantId: tenant.id,
        businessName: application.businessName,
        contactEmail: application.requestedByEmail,
        instagramHandle: application.instagramHandle,
      });
      await this.tenantDomainConfigRepository.create({
        tenantId: tenant.id,
        subdomain: `${slug}.${this.domainConfig.baseDomain}`,
        storefrontReadinessState: 'not_configured',
        adminReadinessState: 'not_configured',
      });

      const customerIdentity = await this.tenantProvisioningGateway.createCustomerPoolAndClient({
        tenantId: tenant.id,
        slug,
      });
      await this.tenantCognitoConfigRepository.create({
        tenantId: tenant.id,
        userPoolId: customerIdentity.userPoolId,
        userPoolArn: customerIdentity.userPoolArn,
        userPoolName: customerIdentity.userPoolName,
        customerClientId: customerIdentity.customerClientId,
        customerClientName: customerIdentity.customerClientName,
        region: customerIdentity.region,
        provisioningStatus: 'ready',
      });

      const tenantAdminIdentity = await this.tenantProvisioningGateway.createTenantAdminIdentity({
        tenantId: tenant.id,
        email: application.requestedByEmail,
        fullName: application.requestedByName,
      });
      const adminUser = await this.adminUsersRepository.create({
        email: application.requestedByEmail,
        fullName: application.requestedByName,
        cognitoSub: tenantAdminIdentity.cognitoSub,
        adminType: 'tenant_scoped_admin',
        status: 'pending_setup',
      });
      await this.adminTenantRelationshipsRepository.create({
        adminUserId: adminUser.id,
        tenantId: tenant.id,
        relationshipType: 'tenant_admin',
        status: 'active',
      });

      const invitationToken = randomBytes(24).toString('hex');
      const invitation = await this.tenantSetupInvitationsRepository.issue({
        tenantId: tenant.id,
        adminUserId: adminUser.id,
        rawToken: invitationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      });

      await this.tenantRepository.update(tenant.id, {
        status: 'setup_pending',
      });
      await this.outboxDispatcherService.enqueue({
        id: `evt_${application.id}_approval_email`,
        name: 'tenant.setup.email.requested',
        aggregateType: 'tenant',
        aggregateId: tenant.id,
        occurredAt: new Date().toISOString(),
        payload: {
          tenantId: tenant.id,
          adminUserId: adminUser.id,
          invitationId: invitation.id,
          invitationToken,
          email: application.requestedByEmail,
        },
      });

      this.logger.log('Tenant provisioning completed', {
        eventName: 'tenant.provisioning.completed',
        tenantId: tenant.id,
        metadata: {
          applicationId: application.id,
        },
      });
      this.metricsService.increment('tenant.provisioning.success');
      await this.auditService.record({
        eventName: 'tenant.provisioning.completed',
        tenantId: tenant.id,
        metadata: {
          applicationId: application.id,
        },
      });

      return {
        tenantId: tenant.id,
        invitationToken,
      };
    } catch (error) {
      await this.tenantRepository.update(tenant.id, {
        status: 'provisioning_failed',
        provisioningFailedAt: new Date().toISOString(),
        provisioningFailureReason: error instanceof Error ? error.message : 'unknown_error',
      });
      this.logger.error('Tenant provisioning failed', undefined, {
        eventName: 'tenant.provisioning.failed',
        tenantId: tenant.id,
        metadata: {
          applicationId: application.id,
          error: error instanceof Error ? error.message : 'unknown_error',
        },
      });
      this.metricsService.increment('tenant.provisioning.failed');
      await this.auditService.record({
        eventName: 'tenant.provisioning.failed',
        tenantId: tenant.id,
        metadata: {
          applicationId: application.id,
          error: error instanceof Error ? error.message : 'unknown_error',
        },
      });
      throw error;
    }
  }

  private toSlug(input: string) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
