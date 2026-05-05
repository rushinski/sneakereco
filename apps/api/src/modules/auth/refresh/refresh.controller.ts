import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';

import { Public } from '../../../common/decorators/public.decorator';
import { CsrfGuard } from '../../../common/guards/csrf.guard';
import { RequestCtx } from '../../../common/context/request-context';
import { THROTTLE } from '../../../config/security.config';
import { readRefreshCookie } from '../shared/tokens/auth-cookie';

import { RefreshService } from './refresh.service';

@Controller('auth')
export class RefreshController {
  constructor(private readonly refreshService: RefreshService) {}

  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: THROTTLE.refresh })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: FastifyRequest) {
    const ctx = RequestCtx.get();
    const surface = ctx?.surface;

    if (!surface || surface === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    const refreshToken = readRefreshCookie(request);
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    if (surface === 'platform-admin') {
      return this.refreshService.refresh(refreshToken, { surface: 'platform-admin' });
    }

    if (surface === 'store-admin') {
      if (!ctx.tenantId) {
        throw new BadRequestException('Tenant authentication is not configured');
      }

      return this.refreshService.refresh(refreshToken, {
        surface: 'store-admin',
        tenantId: ctx.tenantId,
      });
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    return this.refreshService.refresh(refreshToken, { surface: 'customer', pool: ctx.pool });
  }
}
