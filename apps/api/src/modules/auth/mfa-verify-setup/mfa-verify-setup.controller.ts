import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthPrincipalGuard } from '../principals/auth-principal.guard';
import { VerifyMfaSetupDto } from './mfa-verify-setup.dto';
import { MfaVerifySetupService } from './mfa-verify-setup.service';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@UseGuards(AuthPrincipalGuard)
@Controller('auth/mfa/verify-setup')
export class MfaVerifySetupController {
  constructor(private readonly mfaVerifySetupService: MfaVerifySetupService) {}

  @Post()
  @HttpCode(204)
  verifySetup(@Body() body: VerifyMfaSetupDto) {
    return this.mfaVerifySetupService.verifySetup(body.accessToken, body.session, body.code);
  }
}
