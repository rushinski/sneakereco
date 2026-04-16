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
import { buildLoginResponse } from '../auth-cookie';
import { PoolResolverService } from '../pool-resolver/pool-resolver.service';
import {
  MfaSetupAssociateDtoSchema,
  type MfaSetupAssociateDto,
} from './mfa-setup-associate.dto';
import {
  MfaSetupCompleteDtoSchema,
  type MfaSetupCompleteDto,
} from './mfa-setup-complete.dto';
import { MfaSetupService } from './mfa-setup.service';

@Controller('auth')
export class MfaSetupController {
  constructor(
    private readonly mfaSetupService: MfaSetupService,
    private readonly roleContextService: RoleContextService,
    private readonly poolResolver: PoolResolverService,
    private readonly security: SecurityConfig,
  ) {}

  @Public()
  @Throttle({ default: THROTTLE.mfaSetup })
  @Post('mfa/setup/associate')
  @HttpCode(HttpStatus.OK)
  associate(
    @Body(new ZodValidationPipe(MfaSetupAssociateDtoSchema)) dto: MfaSetupAssociateDto,
  ) {
    return this.mfaSetupService.associate(dto.session);
  }

  @Public()
  @Throttle({ default: THROTTLE.mfaSetup })
  @Post('mfa/setup/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Req() request: Request,
    @Body(new ZodValidationPipe(MfaSetupCompleteDtoSchema)) dto: MfaSetupCompleteDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const roleContext = await this.roleContextService.resolve(request);

    if (roleContext.role === 'platform') {
      const result = await this.mfaSetupService.complete(dto, { role: 'platform' });
      return buildLoginResponse(request, response, this.security, result);
    }

    if (!roleContext.tenantId) {
      throw new BadRequestException('X-Tenant-ID header is required');
    }

    const pool = await this.poolResolver.resolveTenantPool(roleContext.tenantId, roleContext.role);
    const result = await this.mfaSetupService.complete(dto, { role: roleContext.role, pool });
    return buildLoginResponse(request, response, this.security, result);
  }
}
