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
import { SecurityConfig } from '../../../config/security.config';
import { THROTTLE } from '../../../config/security.config';
import { CsrfService } from '../../../core/security/csrf/csrf.service';
import { buildLoginResponse } from '../shared/tokens/auth-cookie';

import { MfaChallengeDtoSchema, type MfaChallengeDto } from './mfa-challenge.dto';
import { MfaChallengeService } from './mfa-challenge.service';

@Controller('auth')
export class MfaChallengeController {
  constructor(
    private readonly mfaChallengeService: MfaChallengeService,
    private readonly csrfService: CsrfService,
    private readonly security: SecurityConfig,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.mfaChallenge })
  @Post('mfa/challenge')
  @HttpCode(HttpStatus.OK)
  async challenge(
    @Req() request: Request,
    @Body(new ZodValidationPipe(MfaChallengeDtoSchema)) dto: MfaChallengeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ctx = RequestCtx.get();
    const surface = ctx?.surface;

    if (!surface || surface === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    if (surface === 'platform-admin') {
      const result = await this.mfaChallengeService.respond(dto, { surface: 'platform-admin' });
      return buildLoginResponse(
        request,
        response,
        this.security,
        this.csrfService,
        result,
        'platform-admin',
      );
    }

    if (surface === 'store-admin') {
      if (!ctx.tenantId) {
        throw new BadRequestException('Tenant authentication is not configured');
      }

      const result = await this.mfaChallengeService.respond(dto, {
        surface: 'store-admin',
        tenantId: ctx.tenantId,
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

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    const result = await this.mfaChallengeService.respond(dto, {
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
