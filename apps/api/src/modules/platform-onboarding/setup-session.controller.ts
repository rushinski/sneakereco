import { Body, Controller, Post } from '@nestjs/common';

import type { ConsumeSetupInvitationDto } from './setup-session.dto';
import { SetupSessionService } from './setup-session.service';

@Controller('platform/onboarding/setup-invitations')
export class SetupSessionController {
  constructor(private readonly setupSessionService: SetupSessionService) {}

  @Post('consume')
  consume(@Body() body: ConsumeSetupInvitationDto) {
    return this.setupSessionService.consume(body.token);
  }
}