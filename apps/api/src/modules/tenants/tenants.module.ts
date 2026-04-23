import { Module } from '@nestjs/common';

import { TenantsController } from './tenants.controller';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TenantConfigService } from './tenant-config/tenant-config.service';

@Module({
  imports: [OnboardingModule],
  controllers: [TenantsController, TenantSettingsController],
  providers: [TenantsService, TenantsRepository, TenantConfigService],
  exports: [TenantsService, OnboardingModule],
})
export class TenantsModule {}
