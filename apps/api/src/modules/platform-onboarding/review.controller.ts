import { Body, Controller, Param, Post } from '@nestjs/common';

import type { ApproveApplicationDto, DenyApplicationDto } from './review-application.dto';
import { ReviewService } from './review.service';

@Controller('platform/onboarding/applications')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post(':applicationId/approve')
  approve(@Param('applicationId') applicationId: string, @Body() body: ApproveApplicationDto) {
    return this.reviewService.approve(applicationId, body.reviewedByAdminUserId);
  }

  @Post(':applicationId/deny')
  deny(@Param('applicationId') applicationId: string, @Body() body: DenyApplicationDto) {
    return this.reviewService.deny(applicationId, body);
  }
}