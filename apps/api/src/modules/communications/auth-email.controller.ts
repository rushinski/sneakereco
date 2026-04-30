import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentPrincipal } from '../auth/shared/current-principal.decorator';
import { AuthPrincipalGuard } from '../auth/shared/auth-principal.guard';
import type { AuthPrincipal } from '../auth/shared/auth.types';
import { AuthEmailService } from './auth-email.service';

@Controller('communications/auth-emails')
export class AuthEmailController {
  constructor(private readonly authEmailService: AuthEmailService) {}

  @Post('preview')
  preview(
    @Body()
    body: {
      tenantId?: string;
      emailType: 'verify_email' | 'password_reset' | 'login_otp' | 'setup_invitation';
      stateKey: string;
      designFamilyKey?: string;
    },
  ) {
    return this.authEmailService.preview(body);
  }

  @Post('test-send')
  @UseGuards(AuthPrincipalGuard)
  testSend(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body()
    body: {
      tenantId?: string;
      toEmail: string;
      emailType: 'verify_email' | 'password_reset' | 'login_otp' | 'setup_invitation';
      stateKey: string;
      designFamilyKey?: string;
    },
  ) {
    return this.authEmailService.sendTest({
      principal,
      ...body,
    });
  }
}