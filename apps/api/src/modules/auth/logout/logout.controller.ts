import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../../../common/decorators/user.decorator';
import { CsrfGuard } from '../../../common/guards/csrf.guard';
import { SecurityConfig } from '../../../config/security.config';
import { clearAuthCookies } from '../auth-cookie';
import type { AuthenticatedUser } from '../auth.types';
import { LogoutService } from './logout.service';

@Controller('auth')
export class LogoutController {
  constructor(
    private readonly logoutService: LogoutService,
    private readonly security: SecurityConfig,
  ) {}

  @UseGuards(CsrfGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authorization: string | undefined,
    @CurrentUser() _user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const accessToken = this.getBearerToken(authorization);
    const result = await this.logoutService.logout(accessToken);
    clearAuthCookies(response, this.security);
    return result;
  }

  private getBearerToken(header: string | undefined): string {
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    return header.replace(/^Bearer\s+/i, '');
  }
}
