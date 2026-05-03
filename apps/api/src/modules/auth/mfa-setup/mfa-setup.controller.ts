import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthPrincipalGuard } from '../principals/auth-principal.guard';
import { InitiateMfaSetupDto } from './mfa-setup.dto';
import { MfaSetupService } from './mfa-setup.service';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@UseGuards(AuthPrincipalGuard)
@Controller('auth/mfa/setup')
export class MfaSetupController {
  constructor(private readonly mfaSetupService: MfaSetupService) {}

  @Post()
  initiateSetup(@Body() body: InitiateMfaSetupDto) {
    return this.mfaSetupService.initiateSetup(body.accessToken);
  }
}
