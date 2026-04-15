import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { OnboardingOnly } from '../../common/decorators/onboarding-only.decorator';
import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SecurityConfig, REFRESH_COOKIE_NAME, PLATFORM_REFRESH_COOKIE_PATH, REFRESH_MAX_AGE, THROTTLE } from '../../config/security.config';

import { TenantsService } from './tenants.service';
import { ListRequestsDtoSchema, type ListRequestsDto } from './dto/list-requests.dto';
import {
  PlatformAdminSignInDtoSchema,
  type PlatformAdminSignInDto,
} from './dto/platform-admin-sign-in.dto';
import { MfaChallengeDtoSchema, type MfaChallengeDto } from '../auth/dto/mfa-challenge.dto';
import { MfaSetupAssociateDtoSchema, type MfaSetupAssociateDto } from '../auth/dto/mfa-setup-associate.dto';
import { MfaSetupCompleteDtoSchema, type MfaSetupCompleteDto } from '../auth/dto/mfa-setup-complete.dto';

@ApiTags('platform')
@Controller({ path: 'platform' })
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly security: SecurityConfig,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.security.cookieSecure,
      sameSite: 'strict',
      path: PLATFORM_REFRESH_COOKIE_PATH,
      maxAge: REFRESH_MAX_AGE.admin,
      domain: this.security.cookieDomain,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.security.cookieSecure,
      sameSite: 'strict',
      path: PLATFORM_REFRESH_COOKIE_PATH,
      domain: this.security.cookieDomain,
    });
  }

  /**
   * Platform admin sign-in. Only callable from platform/dashboard origins.
   * Uses the platform Cognito pool (not a tenant pool).
   * Sets the refresh token as an httpOnly cookie; access token returned in body.
   */
  @Public()
  @OnboardingOnly()
  @Throttle({ default: THROTTLE.auth })
  @Post('auth/sign-in')
  @HttpCode(HttpStatus.OK)
  async signInAdmin(
    @Body(new ZodValidationPipe(PlatformAdminSignInDtoSchema)) dto: PlatformAdminSignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.tenantsService.signInAdmin(dto);
    if (result?.type === 'tokens') {
      const { refreshToken, ...clientResult } = result;
      this.setRefreshCookie(res, refreshToken);
      return clientResult;
    }

    this.clearRefreshCookie(res);
    return result; // mfa_required
  }

  /**
   * Platform admin token refresh. Reads the httpOnly refresh cookie and
   * returns a new access token. CSRF-protected.
   */
  @Public()
  @UseGuards(CsrfGuard)
  @Throttle({ default: THROTTLE.refresh })
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshAdmin(@Req() req: Request) {
    const refreshToken = (req.cookies as Record<string, string>)[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    return this.tenantsService.refreshAdmin(refreshToken);
  }

  /**
   * Platform admin MFA challenge. Completes TOTP sign-in after password step.
   * Uses the platform pool — no tenant context needed.
   */
  @Public()
  @Throttle({ default: THROTTLE.mfaChallenge })
  @Post('auth/mfa/challenge')
  @HttpCode(HttpStatus.OK)
  async mfaChallengeAdmin(
    @Body(new ZodValidationPipe(MfaChallengeDtoSchema)) dto: MfaChallengeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.tenantsService.mfaChallengeAdmin(dto);
    if (result?.type === 'tokens') {
      const { refreshToken, ...clientResult } = result;
      this.setRefreshCookie(res, refreshToken);
      return clientResult;
    }
    return result;
  }

  /**
   * Platform admin MFA first-time setup — step 1.
   * Called when sign-in returns mfa_setup. Returns the TOTP secret for QR display.
   */
  @Public()
  @Throttle({ default: THROTTLE.mfaSetup })
  @Post('auth/mfa/setup/associate')
  @HttpCode(HttpStatus.OK)
  associateMfaAdmin(
    @Body(new ZodValidationPipe(MfaSetupAssociateDtoSchema)) body: MfaSetupAssociateDto,
  ) {
    return this.tenantsService.associateSoftwareTokenAdmin(body.session);
  }

  /**
   * Platform admin MFA first-time setup — step 2.
   * Verifies the TOTP code and completes sign-in, returning tokens.
   */
  @Public()
  @Throttle({ default: THROTTLE.mfaSetup })
  @Post('auth/mfa/setup/complete')
  @HttpCode(HttpStatus.OK)
  async completeMfaSetupAdmin(
    @Body(new ZodValidationPipe(MfaSetupCompleteDtoSchema)) body: MfaSetupCompleteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.tenantsService.completeMfaSetupAdmin(body);
    if (result?.type === 'tokens') {
      const { refreshToken, ...clientResult } = result;
      this.setRefreshCookie(res, refreshToken);
      return clientResult;
    }
    return result;
  }

  /**
   * List tenant onboarding requests (paginated, filterable by status).
   * Requires super admin JWT from a platform/dashboard origin.
   */
  @UseGuards(PlatformAdminGuard)
  @PlatformAdmin()
  @Get('requests')
  listRequests(@Query(new ZodValidationPipe(ListRequestsDtoSchema)) dto: ListRequestsDto) {
    return this.tenantsService.listRequests(dto);
  }

  /**
   * Approve a pending onboarding request.
   * Sends an invite email with a setup link to apps/web.
   */
  @UseGuards(PlatformAdminGuard)
  @PlatformAdmin()
  @Post('requests/:tenantId/approve')
  @HttpCode(HttpStatus.OK)
  approveRequest(@Param('tenantId') tenantId: string) {
    return this.tenantsService.approveRequest(tenantId);
  }

  /**
   * Deny a pending onboarding request.
   * Sends a denial notification email.
   */
  @UseGuards(PlatformAdminGuard)
  @PlatformAdmin()
  @Post('requests/:tenantId/deny')
  @HttpCode(HttpStatus.OK)
  denyRequest(@Param('tenantId') tenantId: string) {
    return this.tenantsService.denyRequest(tenantId);
  }

  /**
   * Public endpoint — returns tenant config + theme for the admin login page.
   * Accepts tenant ID via X-Tenant-ID header or slug via ?slug= query param.
   */
  @Public()
  @Get('config')
  getTenantConfig(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('slug') slug: string | undefined,
  ) {
    return this.tenantsService.getTenantConfig((tenantId ?? slug)!);
  }
}
