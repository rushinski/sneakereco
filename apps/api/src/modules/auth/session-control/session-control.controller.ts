import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { RequestCtx } from '../../../common/context/request-context';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/user.decorator';
import { CsrfGuard } from '../../../common/guards/csrf.guard';
import { SecurityConfig } from '../../../config/security.config';
import type { AuthenticatedUser } from '../auth.types';
import { PoolResolverService } from '../shared/pool-resolver/pool-resolver.service';
import { clearAuthCookies } from '../shared/tokens/auth-cookie';

import { SessionControlService } from './session-control.service';

@Controller('auth/sessions')
export class SessionControlController {
  constructor(
    private readonly sessionControl: SessionControlService,
    private readonly poolResolver: PoolResolverService,
    private readonly security: SecurityConfig,
  ) {}

  @UseGuards(CsrfGuard)
  @Post('revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pool = this.resolveCurrentPool();
    const result = await this.sessionControl.revokeAllSessions({
      cognitoSub: user.cognitoSub,
      userPoolId: pool.userPoolId,
    });

    clearAuthCookies(request, response, this.security);
    return result;
  }

  @Roles('platform-admin')
  @UseGuards(CsrfGuard)
  @Post('revoke-user')
  @HttpCode(HttpStatus.OK)
  revokeTargetUserSessions(@Body() body: { cognitoSub?: string; userPoolId?: string }) {
    if (!body.cognitoSub || !body.userPoolId) {
      throw new BadRequestException('cognitoSub and userPoolId are required');
    }

    return this.sessionControl.revokeAllSessions({
      cognitoSub: body.cognitoSub,
      userPoolId: body.userPoolId,
    });
  }

  private resolveCurrentPool() {
    const ctx = RequestCtx.get();

    if (!ctx || ctx.surface === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    if (ctx.surface === 'platform-admin') {
      return this.poolResolver.getPlatformAdminPool();
    }

    if (ctx.surface === 'store-admin') {
      return this.poolResolver.getStoreAdminPool();
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    return ctx.pool;
  }
}
