import { Module, forwardRef } from '@nestjs/common';

import { EventsModule } from '../../core/events/events.module';
import { ObservabilityModule } from '../../core/observability/observability.module';
import { CognitoModule } from '../../core/cognito/cognito.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformOnboardingModule } from '../platform-onboarding/platform-onboarding.module';
import { TenantProvisioningWorkerService } from '../../workers/tenant-provisioning/tenant-provisioning.worker.service';
import { TenantProvisioningGateway } from './tenant-provisioning/tenant-provisioning.gateway';
import { TenantProvisioningService } from './tenant-provisioning/tenant-provisioning.service';
import { TenantRepository } from './tenant-lifecycle/tenant.repository';
import { TenantDomainConfigRepository } from './tenant-domain/tenant-domain-config.repository';
import { TenantCognitoConfigRepository } from './tenant-cognito/tenant-cognito-config.repository';
import { TenantBusinessProfileRepository } from './tenant-business-profile/tenant-business-profile.repository';
import { AdminTenantRelationshipsRepository } from './tenant-admin-relationships/admin-tenant-relationships.repository';
import { TenantResolutionService } from './tenant-domain/tenant-resolution.service';
import { TenantsController } from './tenants.controller';

@Module({
  controllers: [TenantsController],
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AuditModule),
    EventsModule,
    ObservabilityModule,
    CognitoModule,
    forwardRef(() => PlatformOnboardingModule),
  ],
  providers: [
    TenantRepository,
    TenantBusinessProfileRepository,
    TenantDomainConfigRepository,
    TenantCognitoConfigRepository,
    AdminTenantRelationshipsRepository,
    TenantProvisioningGateway,
    TenantProvisioningService,
    TenantProvisioningWorkerService,
    TenantResolutionService,
  ],
  exports: [
    TenantRepository,
    TenantBusinessProfileRepository,
    TenantDomainConfigRepository,
    TenantCognitoConfigRepository,
    AdminTenantRelationshipsRepository,
    TenantProvisioningGateway,
    TenantProvisioningService,
    TenantProvisioningWorkerService,
    TenantResolutionService,
  ],
})
export class TenantsModule {}
