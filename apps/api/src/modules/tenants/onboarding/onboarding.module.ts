import { Module } from '@nestjs/common';

import { CognitoProvisioningService } from '../cognito-provisioning.service';

import { OnboardingController } from './onboarding.controller';
import { OnboardingRepository } from './onboarding.repository';
import { OnboardingService } from './onboarding.service';

@Module({
  controllers: [OnboardingController],
  providers: [CognitoProvisioningService, OnboardingRepository, OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
