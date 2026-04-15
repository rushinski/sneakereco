import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TenantsController } from './tenants.controller';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TenantConfigService } from './tenant-config/tenant-config.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@Module({
  imports: [OnboardingModule, AuthModule],
  controllers: [TenantsController, TenantSettingsController],
  providers: [TenantsService, TenantsRepository, TenantConfigService, PlatformAdminGuard],
  exports: [TenantsService, OnboardingModule],
})
export class TenantsModule {}
