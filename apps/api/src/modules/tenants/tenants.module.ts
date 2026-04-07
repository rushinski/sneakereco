import { Module } from '@nestjs/common';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService, OnboardingModule],
})
export class TenantsModule {}
