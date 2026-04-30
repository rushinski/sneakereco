import { Body, Controller, Post } from '@nestjs/common';

import type { ApplicationSubmissionDto } from './application-submission.dto';
import { ApplicationSubmissionService } from './application-submission.service';

@Controller('platform/onboarding/applications')
export class ApplicationSubmissionController {
  constructor(private readonly applicationSubmissionService: ApplicationSubmissionService) {}

  @Post()
  submit(@Body() body: ApplicationSubmissionDto) {
    return this.applicationSubmissionService.submit(body);
  }
}