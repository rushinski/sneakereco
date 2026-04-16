import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { CsrfGuard } from '../../../common/guards/csrf.guard';
import { RoleContextService } from '../../../common/services/role-context.service';
import { REFRESH_COOKIE_NAME, THROTTLE } from '../../../config/security.config';
import { PoolResolverService } from '../pool-resolver/pool-resolver.service';
import { RefreshService } from './refresh.service';

@Controller('auth')
export class RefreshController {
  constructor(
    private readonly refreshService: RefreshService,
    private readonly roleContextService: RoleContextService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: THROTTLE.refresh })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request) {
    const refreshToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const roleContext = await this.roleContextService.resolve(request);
    if (roleContext.role === 'platform') {
      return this.refreshService.refresh(refreshToken, { role: 'platform' });
    }
    if (!roleContext.tenantId) {
      throw new BadRequestException('X-Tenant-ID header is required');
    }

    const pool = await this.poolResolver.resolveTenantPool(roleContext.tenantId, roleContext.role);
    return this.refreshService.refresh(refreshToken, { role: roleContext.role, pool });
  }
}
