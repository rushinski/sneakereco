import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../../auth/principals/auth-rate-limit.decorator';
import type { ApplicationSubmissionDto } from './application-submission.dto';
import { ApplicationSubmissionService } from './application-submission.service';

@Controller('platform/onboarding/applications')
export class ApplicationSubmissionController {
  constructor(private readonly applicationSubmissionService: ApplicationSubmissionService) {}

  @Post()
  @AuthRateLimit('onboarding-application')
  submit(@Body() body: ApplicationSubmissionDto) {
    return this.applicationSubmissionService.submit(body);
  }
}
