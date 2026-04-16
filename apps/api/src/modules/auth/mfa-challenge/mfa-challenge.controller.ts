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
import { MfaChallengeDtoSchema, type MfaChallengeDto } from './mfa-challenge.dto';
import { MfaChallengeService } from './mfa-challenge.service';

@Controller('auth')
export class MfaChallengeController {
  constructor(
    private readonly mfaChallengeService: MfaChallengeService,
    private readonly roleContextService: RoleContextService,
    private readonly poolResolver: PoolResolverService,
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
    const roleContext = await this.roleContextService.resolve(request);

    if (roleContext.role === 'platform') {
      const result = await this.mfaChallengeService.respond(dto, { role: 'platform' });
      return buildLoginResponse(request, response, this.security, result);
    }

    if (!roleContext.tenantId) {
      throw new BadRequestException('X-Tenant-ID header is required');
    }

    const pool = await this.poolResolver.resolveTenantPool(roleContext.tenantId, roleContext.role);
    const result = await this.mfaChallengeService.respond(dto, { role: roleContext.role, pool });
    return buildLoginResponse(request, response, this.security, result);
  }
}
