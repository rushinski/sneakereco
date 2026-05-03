import { Body, Controller, ForbiddenException, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthPrincipalGuard } from '../principals/auth-principal.guard';
import { CurrentPrincipal } from '../principals/current-principal.decorator';
import type { AuthPrincipal } from '../principals/auth.types';
import { MfaDisableDto } from './mfa-disable.dto';
import { MfaDisableService } from './mfa-disable.service';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@UseGuards(AuthPrincipalGuard)
@Controller('auth/mfa/disable')
export class MfaDisableController {
  constructor(private readonly mfaDisableService: MfaDisableService) {}

  @Post()
  @HttpCode(204)
  disable(@CurrentPrincipal() principal: AuthPrincipal, @Body() body: MfaDisableDto) {
    if (principal.actorType !== 'customer') {
      throw new ForbiddenException('MFA disable is only available for customers');
    }
    return this.mfaDisableService.disable(body.accessToken);
  }
}
