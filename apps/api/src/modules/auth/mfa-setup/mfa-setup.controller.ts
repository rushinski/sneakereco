import {
  BadRequestException,
  Body,
  Controller,
  Headers,
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
import { SecurityConfig } from '../../../config/security.config';
import { THROTTLE } from '../../../config/security.config';
import { CsrfService } from '../../../core/security/csrf/csrf.service';
import { buildLoginResponse } from '../shared/tokens/auth-cookie';

import { MfaSetupAssociateDtoSchema, type MfaSetupAssociateDto } from './mfa-setup-associate.dto';
import { MfaSetupCompleteDtoSchema, type MfaSetupCompleteDto } from './mfa-setup-complete.dto';
import { MfaSetupService } from './mfa-setup.service';

@Controller('auth')
export class MfaSetupController {
  constructor(
    private readonly mfaSetupService: MfaSetupService,
    private readonly csrfService: CsrfService,
    private readonly security: SecurityConfig,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.mfaSetup })
  @Post('mfa/setup/associate')
  @HttpCode(HttpStatus.OK)
  associate(@Body(new ZodValidationPipe(MfaSetupAssociateDtoSchema)) dto: MfaSetupAssociateDto) {
    return this.mfaSetupService.associate(dto.session);
  }

  @Public()
  @Throttle({ default: THROTTLE.mfaSetup })
  @Post('mfa/setup/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Req() request: Request,
    @Body(new ZodValidationPipe(MfaSetupCompleteDtoSchema)) dto: MfaSetupCompleteDto,
    @Headers('x-client-context') clientContext: string | undefined,
    @Headers('x-tenant-id') tenantIdHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ctx = RequestCtx.get();
    const surface = ctx?.surface;

    if (!surface || surface === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    const tenantAdminTenantId =
      surface === 'store-admin' ? ctx?.tenantId : clientContext === 'admin' ? tenantIdHeader : null;

    if (tenantAdminTenantId) {
      const result = await this.mfaSetupService.complete(dto, {
        surface: 'store-admin',
        tenantId: tenantAdminTenantId,
      });
      return buildLoginResponse(
        request,
        response,
        this.security,
        this.csrfService,
        result,
        'store-admin',
      );
    }

    if (surface === 'platform-admin') {
      const result = await this.mfaSetupService.complete(dto, { surface: 'platform-admin' });
      return buildLoginResponse(
        request,
        response,
        this.security,
        this.csrfService,
        result,
        'platform-admin',
      );
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    const result = await this.mfaSetupService.complete(dto, {
      surface: 'customer',
      pool: ctx.pool,
    });
    return buildLoginResponse(
      request,
      response,
      this.security,
      this.csrfService,
      result,
      'customer',
    );
  }
}
