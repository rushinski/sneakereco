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
import { RequestCtx } from '../../../common/context/request-context';
import { SecurityConfig, THROTTLE } from '../../../config/security.config';
import { CsrfService } from '../../../core/security/csrf/csrf.service';
import { buildLoginResponse, clearAuthCookies } from '../shared/tokens/auth-cookie';
import { LoginDtoSchema, type LoginDto } from './login.dto';
import { LoginService } from './login.service';

@Controller('auth')
export class LoginController {
  constructor(
    private readonly loginService: LoginService,
    private readonly csrfService: CsrfService,
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
    const ctx = RequestCtx.get();
    const origin = ctx?.origin;

    if (!origin || origin === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    if (origin === 'platform') {
      const result = await this.loginService.login(dto, { role: 'platform' });

      if (result.type === 'tokens') {
        return buildLoginResponse(
          request,
          response,
          this.security,
          this.csrfService,
          result,
          'platform',
        );
      }

      clearAuthCookies(response, this.security);
      return result;
    }

    if (origin === 'tenant-admin') {
      if (!ctx.tenantId) {
        throw new BadRequestException('Tenant context is not configured');
      }

      const result = await this.loginService.login(dto, { role: 'admin', tenantId: ctx.tenantId });

      if (result.type === 'tokens') {
        return buildLoginResponse(
          request,
          response,
          this.security,
          this.csrfService,
          result,
          origin,
        );
      }

      clearAuthCookies(response, this.security);
      return result;
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    const result = await this.loginService.login(dto, { role: 'customer', pool: ctx.pool });

    if (result.type === 'tokens') {
      return buildLoginResponse(request, response, this.security, this.csrfService, result, origin);
    }

    clearAuthCookies(response, this.security);
    return result;
  }
}
