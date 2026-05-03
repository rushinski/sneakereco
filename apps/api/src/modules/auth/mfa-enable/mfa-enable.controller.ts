import { Body, Controller, ForbiddenException, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthPrincipalGuard } from '../principals/auth-principal.guard';
import { CurrentPrincipal } from '../principals/current-principal.decorator';
import type { AuthPrincipal } from '../principals/auth.types';
import { MfaEnableDto } from './mfa-enable.dto';
import { MfaEnableService } from './mfa-enable.service';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@UseGuards(AuthPrincipalGuard)
@Controller('auth/mfa/enable')
export class MfaEnableController {
  constructor(private readonly mfaEnableService: MfaEnableService) {}

  @Post()
  @HttpCode(204)
  enable(@CurrentPrincipal() principal: AuthPrincipal, @Body() body: MfaEnableDto) {
    if (principal.actorType !== 'customer') {
      throw new ForbiddenException('MFA enable is only available for customers');
    }
    return this.mfaEnableService.enable(body.accessToken);
  }
}
