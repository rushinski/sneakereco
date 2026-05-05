import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { RequestCtx } from '../../../common/context/request-context';
import { SecurityConfig } from '../../../config/security.config';
import { THROTTLE } from '../../../config/security.config';
import { CsrfService } from '../../../core/security/csrf/csrf.service';
import { buildLoginResponse, clearAuthCookies } from '../shared/tokens/auth-cookie';

import {
  OtpRequestDtoSchema,
  OtpVerifyDtoSchema,
  type OtpRequestDto,
  type OtpVerifyDto,
} from './otp.dto';
import { OtpService } from './otp.service';

@Controller('auth/otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly csrfService: CsrfService,
    private readonly security: SecurityConfig,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.auth })
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async request(@Body(new ZodValidationPipe(OtpRequestDtoSchema)) dto: OtpRequestDto) {
    const ctx = RequestCtx.get();

    if (ctx?.surface !== 'customer') {
      throw new ForbiddenException('OTP login is only available for customer accounts');
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    return this.otpService.request(dto, ctx.pool);
  }

  @Public()
  @Throttle({ default: THROTTLE.auth })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Req() request: FastifyRequest,
    @Body(new ZodValidationPipe(OtpVerifyDtoSchema)) dto: OtpVerifyDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const ctx = RequestCtx.get();

    if (ctx?.surface !== 'customer') {
      throw new ForbiddenException('OTP login is only available for customer accounts');
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    const result = await this.otpService.verify(dto, ctx.pool);

    if (result.type === 'tokens') {
      return buildLoginResponse(
        request,
        response,
        this.security,
        this.csrfService,
        result,
        'customer',
      );
    }

    clearAuthCookies(request, response, this.security, 'customer');
    return result;
  }
}
