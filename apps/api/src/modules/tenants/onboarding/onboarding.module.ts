import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { CommunicationsModule } from '../../communications/communications.module';
import { CognitoProvisioningService } from '../cognito-provisioning.service';


import { OnboardingController } from './onboarding.controller';
import { OnboardingRepository } from './onboarding.repository';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AuthModule, CommunicationsModule],
  controllers: [OnboardingController],
  providers: [CognitoProvisioningService, OnboardingRepository, OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
