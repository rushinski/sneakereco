import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentPrincipal } from '../principals/current-principal.decorator';
import { AuthPrincipalGuard } from '../principals/auth-principal.guard';
import type { AuthPrincipal } from '../principals/auth.types';
import { LogoutService } from './logout.service';

@Controller('auth/session-control')
export class LogoutController {
  constructor(private readonly logoutService: LogoutService) {}

  @Get('me')
  @UseGuards(AuthPrincipalGuard)
  me(@CurrentPrincipal() principal: AuthPrincipal) {
    return { principal };
  }

  @Post('logout')
  @UseGuards(AuthPrincipalGuard)
  logout(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.logoutService.logout(principal);
  }

  @Post('logout-all')
  @UseGuards(AuthPrincipalGuard)
  logoutAll(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.logoutService.logoutAll(principal);
  }
}
