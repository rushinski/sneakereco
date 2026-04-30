import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../shared/auth-rate-limit.decorator';
import type { MfaChallengeDto } from './mfa-challenge.dto';
import { MfaChallengeService } from './mfa-challenge.service';

@Controller('auth/mfa/challenge')
export class MfaChallengeController {
  constructor(private readonly mfaChallengeService: MfaChallengeService) {}

  @Post()
  @AuthRateLimit('mfa-challenge')
  complete(@Body() body: MfaChallengeDto) {
    return this.mfaChallengeService.complete(body);
  }
}