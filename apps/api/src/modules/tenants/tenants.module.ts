import { Module, forwardRef } from '@nestjs/common';

import { EventsModule } from '../../core/events/events.module';
import { ObservabilityModule } from '../../core/observability/observability.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformOnboardingModule } from '../platform-onboarding/platform-onboarding.module';
import { AdminTenantRelationshipsRepository } from './admin-tenant-relationships.repository';
import { TenantBusinessProfileRepository } from './tenant-business-profile.repository';
import { TenantCognitoConfigRepository } from './tenant-cognito-config.repository';
import { TenantDomainConfigRepository } from './tenant-domain-config.repository';
import { TenantProvisioningGateway } from './tenant-provisioning.gateway';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantRepository } from './tenant.repository';
import { TenantProvisioningWorkerService } from '../../workers/tenant-provisioning/tenant-provisioning.worker.service';

@Module({
  imports: [AuthModule, EventsModule, ObservabilityModule, forwardRef(() => PlatformOnboardingModule)],
  providers: [
    TenantRepository,
    TenantBusinessProfileRepository,
    TenantDomainConfigRepository,
    TenantCognitoConfigRepository,
    AdminTenantRelationshipsRepository,
    TenantProvisioningGateway,
    TenantProvisioningService,
    TenantProvisioningWorkerService,
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
  ],
})
export class TenantsModule {}