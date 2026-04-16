import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { RoleContextService } from '../../../common/services/role-context.service';
import { SecurityConfig, THROTTLE } from '../../../config/security.config';
import { buildLoginResponse, clearAuthCookies } from '../auth-cookie';
import { PoolResolverService } from '../pool-resolver/pool-resolver.service';
import { LoginDtoSchema, type LoginDto } from './login.dto';
import { LoginService } from './login.service';

@Controller('auth')
export class LoginController {
  constructor(
    private readonly loginService: LoginService,
    private readonly roleContextService: RoleContextService,
    private readonly poolResolver: PoolResolverService,
    private readonly security: SecurityConfig,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.auth })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() request: Request,
    @Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const roleContext = await this.roleContextService.resolve(request);

    if (roleContext.role === 'platform') {
      const result = await this.loginService.login(dto, { role: 'platform' });

      if (result.type === 'tokens') {
        return buildLoginResponse(request, response, this.security, result);
      }

      clearAuthCookies(response, this.security);
      return result;
    }

    if (!roleContext.tenantId) {
      throw new BadRequestException('X-Tenant-ID header is required');
    }

    const pool = await this.poolResolver.resolveTenantPool(roleContext.tenantId, roleContext.role);
    const result = await this.loginService.login(dto, { role: roleContext.role, pool });

    if (result.type === 'tokens') {
      return buildLoginResponse(request, response, this.security, result);
    }

    clearAuthCookies(response, this.security);
    return result;
  }
}
