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
import { ForgotPasswordDtoSchema, type ForgotPasswordDto } from './forgot-password.dto';
import { PasswordResetService } from './password-reset.service';
import { ResetPasswordDtoSchema, type ResetPasswordDto } from './reset-password.dto';

@Controller('auth')
export class PasswordResetController {
  constructor(
    private readonly passwordResetService: PasswordResetService,
    private readonly roleContextService: RoleContextService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.forgotPassword })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Req() request: Request,
    @Body(new ZodValidationPipe(ForgotPasswordDtoSchema)) dto: ForgotPasswordDto,
  ) {
    return this.resolveSupportedFlow(request, (pool) =>
      this.passwordResetService.forgotPassword(dto, pool),
    );
  }

  @Public()
  @Throttle({ default: THROTTLE.resetPassword })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Req() request: Request,
    @Body(new ZodValidationPipe(ResetPasswordDtoSchema)) dto: ResetPasswordDto,
  ) {
    return this.resolveSupportedFlow(request, (pool) =>
      this.passwordResetService.resetPassword(dto, pool),
    );
  }

  private async resolveSupportedFlow<T>(
    request: Request,
    handler: (
      pool: Awaited<ReturnType<PoolResolverService['resolveTenantPool']>>,
    ) => Promise<T> | T,
  ): Promise<T> {
    const roleContext = await this.roleContextService.resolve(request);
    if (roleContext.role === 'platform') {
      throw new ForbiddenException('Platform auth context is not supported for password reset');
    }
    if (!roleContext.tenantId) {
      throw new BadRequestException('X-Tenant-ID header is required');
    }

    const pool = await this.poolResolver.resolveTenantPool(roleContext.tenantId, roleContext.role);
    return handler(pool);
  }
}
