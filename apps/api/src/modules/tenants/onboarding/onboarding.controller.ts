import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OnboardingOnly } from '../../../common/decorators/onboarding-only.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

import {
  CompleteOnboardingDtoSchema,
  type CompleteOnboardingDto,
} from './dto/complete-onboarding.dto';
import {
  RequestOnboardingDtoSchema,
  type RequestOnboardingDto,
} from './dto/request-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@Controller({ path: 'onboarding' })
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @OnboardingOnly()
  @Post('request')
  @ApiOperation({ summary: 'Submit a tenant onboarding request' })
  @ApiResponse({ status: 201, description: 'Request received.' })
  requestAccount(
    @Body(new ZodValidationPipe(RequestOnboardingDtoSchema)) dto: RequestOnboardingDto,
  ) {
    return this.onboardingService.requestAccount(dto);
  }

  @Public()
  @Get('invite/:token')
  @ApiOperation({ summary: 'Validate an onboarding invite token' })
  @ApiResponse({ status: 200, description: 'Invite is valid.' })
  @ApiResponse({ status: 404, description: 'Invite not found.' })
  @ApiResponse({ status: 410, description: 'Invite expired or already used.' })
  validateInvite(@Param('token') token: string) {
    return this.onboardingService.validateInvite(token);
  }

  // No @OnboardingOnly() — setup page lives in apps/web (tenant origin).
  // The invite token (256-bit random) is the security mechanism.
  @Public()
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete onboarding and provision the first admin account' })
  @ApiResponse({ status: 200, description: 'Onboarding complete.' })
  completeOnboarding(
    @Body(new ZodValidationPipe(CompleteOnboardingDtoSchema)) dto: CompleteOnboardingDto,
  ) {
    return this.onboardingService.completeOnboarding(dto);
  }
}
