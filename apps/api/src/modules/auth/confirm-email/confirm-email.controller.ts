import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../shared/auth-rate-limit.decorator';
import type { ConfirmEmailDto } from './confirm-email.dto';
import { ConfirmEmailService } from './confirm-email.service';

@Controller('auth/confirm-email')
export class ConfirmEmailController {
  constructor(private readonly confirmEmailService: ConfirmEmailService) {}

  @Post()
  @AuthRateLimit('confirm-email')
  confirm(@Body() body: ConfirmEmailDto) {
    return this.confirmEmailService.confirm(body);
  }
}