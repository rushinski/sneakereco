import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { RequestCtx } from '../../../common/context/request-context';
import { THROTTLE } from '../../../config/security.config';
import type { PoolCredentials } from '../shared/cognito/cognito.types';

import { ForgotPasswordDtoSchema, type ForgotPasswordDto } from './forgot-password.dto';
import { PasswordResetService } from './password-reset.service';
import { ResetPasswordDtoSchema, type ResetPasswordDto } from './reset-password.dto';

@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Public()
  @Throttle({ default: THROTTLE.forgotPassword })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordDtoSchema)) dto: ForgotPasswordDto) {
    return this.resolveSupportedFlow((pool) => this.passwordResetService.forgotPassword(dto, pool));
  }

  @Public()
  @Throttle({ default: THROTTLE.resetPassword })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body(new ZodValidationPipe(ResetPasswordDtoSchema)) dto: ResetPasswordDto) {
    return this.resolveSupportedFlow((pool) => this.passwordResetService.resetPassword(dto, pool));
  }

  private async resolveSupportedFlow<T>(
    handler: (pool: PoolCredentials) => Promise<T> | T,
  ): Promise<T> {
    const ctx = RequestCtx.get();
    const surface = ctx?.surface;

    if (surface === 'platform-admin') {
      throw new ForbiddenException('Platform accounts use admin-managed password reset');
    }

    if (!surface || surface === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    if (surface !== 'customer' && surface !== 'store-admin') {
      throw new BadRequestException('Origin not allowed');
    }

    if (!ctx.pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    return handler(ctx.pool);
  }
}
