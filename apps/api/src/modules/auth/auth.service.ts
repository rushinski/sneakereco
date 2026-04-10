import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { generateId } from '@sneakereco/shared';
import { users, tenantCognitoConfig } from '@sneakereco/db';

import { DatabaseService } from '../../common/database/database.service';
import { CognitoService, type PoolCredentials } from './cognito.service';
import type { ConfirmEmailDto } from './dto/confirm-email.dto';
import type { DisableMfaDto } from './dto/disable-mfa.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { MfaChallengeDto } from './dto/mfa-challenge.dto';
import type { ResendConfirmationDto } from './dto/resend-confirmation.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SignInDto } from './dto/sign-in.dto';
import type { SignOutDto } from './dto/sign-out.dto';
import type { SignUpDto } from './dto/sign-up.dto';
import type { VerifyMfaDto } from './dto/verify-mfa.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly db: DatabaseService,
  ) {}

  // ---------------------------------------------------------------------------
  // Pool resolution
  // ---------------------------------------------------------------------------

  private async resolveTenantPool(
    tenantId: string,
    clientType: 'customer' | 'admin' = 'customer',
  ): Promise<PoolCredentials> {
    const [config] = await this.db.withSystemContext((tx) =>
      tx
        .select()
        .from(tenantCognitoConfig)
        .where(eq(tenantCognitoConfig.tenantId, tenantId))
        .limit(1),
    );

    if (!config) throw new NotFoundException('Tenant authentication is not configured');

    return {
      userPoolId: config.userPoolId,
      clientId: clientType === 'admin' ? config.adminClientId : config.customerClientId,
    };
  }

  // ---------------------------------------------------------------------------
  // Customer self-service (require tenantId)
  // ---------------------------------------------------------------------------

  async signUp(dto: SignUpDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, 'customer');
    return this.cognito.signUp(dto, pool);
  }

  async confirmEmail(dto: ConfirmEmailDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, 'customer');

    // Step 1: Confirm in Cognito
    await this.cognito.confirmSignUp(dto, pool);

    // Step 2: Fetch Cognito sub (only available after confirmation)
    const cognitoSub = await this.cognito.adminGetUser(dto.email, pool.userPoolId);

    // Step 3: Create users row (system context bypasses RLS; idempotent)
    await this.db.withSystemContext(async (tx) => {
      await tx
        .insert(users)
        .values({ id: generateId('user'), email: dto.email, cognitoSub })
        .onConflictDoNothing({ target: users.cognitoSub });
    });

    return { success: true };
  }

  async resendConfirmationCode(dto: ResendConfirmationDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, 'customer');
    await this.cognito.resendConfirmationCode(dto, pool);
    return { success: true };
  }

  async signIn(dto: SignInDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, dto.clientType ?? 'customer');
    return this.cognito.signIn(dto, pool);
  }

  async respondToMfaChallenge(dto: MfaChallengeDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, dto.clientType ?? 'customer');
    return this.cognito.respondToMfaChallenge(dto, pool);
  }

  async forgotPassword(dto: ForgotPasswordDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, 'customer');
    await this.cognito.forgotPassword(dto, pool);
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto, tenantId: string) {
    const pool = await this.resolveTenantPool(tenantId, 'customer');
    await this.cognito.confirmForgotPassword(dto, pool);
    return { success: true };
  }

  async refreshTokens(
    refreshToken: string,
    clientType: 'customer' | 'admin' = 'customer',
    tenantId: string,
  ) {
    const pool = await this.resolveTenantPool(tenantId, clientType);
    return this.cognito.refreshTokens(refreshToken, pool);
  }

  // ---------------------------------------------------------------------------
  // MFA / token operations (access-token based — no pool needed)
  // ---------------------------------------------------------------------------

  async associateSoftwareToken(accessToken: string) {
    return this.cognito.associateSoftwareToken(accessToken);
  }

  async verifyMfa(dto: VerifyMfaDto, accessToken: string) {
    const result = await this.cognito.verifySoftwareToken(accessToken, dto);
    await this.cognito.setUserMfaPreference(accessToken, true);
    return result;
  }

  async enableMfa(accessToken: string) {
    await this.cognito.setUserMfaPreference(accessToken, true);
    return { success: true };
  }

  async disableMfa(dto: DisableMfaDto, accessToken: string) {
    await this.cognito.disableMfa(dto, accessToken);
    return { success: true };
  }

  async signOut(dto: SignOutDto) {
    await this.cognito.signOut(dto);
    return { success: true };
  }
}
