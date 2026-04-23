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
import { ConfirmEmailDtoSchema, type ConfirmEmailDto } from './confirm-email.dto';
import { RegisterDtoSchema, type RegisterDto } from './register.dto';
import { RegisterService } from './register.service';
import { ResendConfirmationDtoSchema, type ResendConfirmationDto } from './resend-confirmation.dto';
import type { PoolCredentials } from '../shared/cognito/cognito.types';

@Controller('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Public()
  @Throttle({ default: THROTTLE.signup })
  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto) {
    return this.resolveCustomerFlow((_tenantId, pool) =>
      this.registerService.register(dto, pool),
    );
  }

  @Public()
  @Throttle({ default: THROTTLE.confirmEmail })
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirmEmail(@Body(new ZodValidationPipe(ConfirmEmailDtoSchema)) dto: ConfirmEmailDto) {
    return this.resolveCustomerFlow((tenantId, pool) =>
      this.registerService.confirmEmail(dto, pool, tenantId),
    );
  }

  @Public()
  @Throttle({ default: THROTTLE.confirmResend })
  @Post('confirm/resend')
  @HttpCode(HttpStatus.OK)
  resendConfirmation(
    @Body(new ZodValidationPipe(ResendConfirmationDtoSchema)) dto: ResendConfirmationDto,
  ) {
    return this.resolveCustomerFlow((_tenantId, pool) =>
      this.registerService.resendConfirmationCode(dto, pool),
    );
  }

  private async resolveCustomerFlow<T>(
    handler: (tenantId: string, pool: PoolCredentials) => Promise<T> | T,
  ): Promise<T> {
    const ctx = RequestCtx.get();

    if (ctx?.origin !== 'customer') {
      throw new ForbiddenException('Customer auth context required');
    }

    if (!ctx.tenantId || !ctx.pool) {
      throw new BadRequestException('Tenant context is not configured');
    }

    return handler(ctx.tenantId, ctx.pool);
  }
}
