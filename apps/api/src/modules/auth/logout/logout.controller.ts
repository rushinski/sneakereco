import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentPrincipal } from '../shared/current-principal.decorator';
import { AuthPrincipalGuard } from '../shared/auth-principal.guard';
import type { AuthPrincipal } from '../shared/auth.types';
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