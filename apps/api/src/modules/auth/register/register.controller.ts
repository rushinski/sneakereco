import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { RoleContextService } from '../../../common/services/role-context.service';
import { THROTTLE } from '../../../config/security.config';
import { PoolResolverService } from '../pool-resolver/pool-resolver.service';
import { ConfirmEmailDtoSchema, type ConfirmEmailDto } from './confirm-email.dto';
import { RegisterDtoSchema, type RegisterDto } from './register.dto';
import { RegisterService } from './register.service';
import { ResendConfirmationDtoSchema, type ResendConfirmationDto } from './resend-confirmation.dto';

@Controller('auth')
export class RegisterController {
  constructor(
    private readonly registerService: RegisterService,
    private readonly roleContextService: RoleContextService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.signup })
  @Post('register')
  register(
    @Req() request: Request,
    @Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto,
  ) {
    return this.resolveCustomerFlow(request, (_tenantId, pool) =>
      this.registerService.register(dto, pool),
    );
  }

  @Public()
  @Throttle({ default: THROTTLE.confirmEmail })
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirmEmail(
    @Req() request: Request,
    @Body(new ZodValidationPipe(ConfirmEmailDtoSchema)) dto: ConfirmEmailDto,
  ) {
    return this.resolveCustomerFlow(request, (tenantId, pool) =>
      this.registerService.confirmEmail(dto, pool, tenantId),
    );
  }

  @Public()
  @Throttle({ default: THROTTLE.confirmResend })
  @Post('confirm/resend')
  @HttpCode(HttpStatus.OK)
  resendConfirmation(
    @Req() request: Request,
    @Body(new ZodValidationPipe(ResendConfirmationDtoSchema)) dto: ResendConfirmationDto,
  ) {
    return this.resolveCustomerFlow(request, (_tenantId, pool) =>
      this.registerService.resendConfirmationCode(dto, pool),
    );
  }

  private async resolveCustomerFlow<T>(
    request: Request,
    handler: (
      tenantId: string,
      pool: Awaited<ReturnType<PoolResolverService['resolveTenantPool']>>,
    ) => Promise<T> | T,
  ): Promise<T> {
    const roleContext = await this.roleContextService.resolve(request);
    if (roleContext.role !== 'customer') {
      throw new ForbiddenException('Customer auth context required');
    }
    if (!roleContext.tenantId) {
      throw new BadRequestException('X-Tenant-ID header is required');
    }

    const pool = await this.poolResolver.resolveTenantPool(roleContext.tenantId, 'customer');
    return handler(roleContext.tenantId, pool);
  }
}
