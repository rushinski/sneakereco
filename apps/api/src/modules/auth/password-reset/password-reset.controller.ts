import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../shared/auth-rate-limit.decorator';
import type { ForgotPasswordDto } from './forgot-password.dto';
import { PasswordResetService } from './password-reset.service';
import type { ResetPasswordDto } from './reset-password.dto';

@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('forgot')
  @AuthRateLimit('forgot-password')
  forgot(@Body() body: ForgotPasswordDto) {
    return this.passwordResetService.requestReset(body);
  }

  @Post('reset')
  @AuthRateLimit('reset-password')
  reset(@Body() body: ResetPasswordDto) {
    return this.passwordResetService.completeReset(body);
  }
}