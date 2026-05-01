import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../principals/auth-rate-limit.decorator';
import type { BeginAdminSetupDto, CompleteAdminSetupDto } from './admin-setup.dto';
import { AdminSetupService } from './admin-setup.service';

@Controller('auth/admin/setup')
export class AdminSetupController {
  constructor(private readonly adminSetupService: AdminSetupService) {}

  @Post('begin')
  @AuthRateLimit('setup-invitation-consume')
  begin(@Body() body: BeginAdminSetupDto) {
    return this.adminSetupService.begin(body);
  }

  @Post('complete')
  @AuthRateLimit('mfa-challenge')
  complete(@Body() body: CompleteAdminSetupDto) {
    return this.adminSetupService.complete(body);
  }
}
