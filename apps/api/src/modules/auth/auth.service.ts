import { Injectable } from '@nestjs/common';
import { generateId } from '@sneakereco/shared';
import { users } from '@sneakereco/db';
import { DatabaseService } from '../../common/database/database.service';
import { CognitoService } from './cognito.service';
import type { ConfirmEmailDto } from './dto/confirm-email.dto';
import type { DisableMfaDto } from './dto/disable-mfa.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { MfaChallengeDto } from './dto/mfa-challenge.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
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

  async signUp(dto: SignUpDto) {
    // NO DB write — user is unconfirmed in Cognito, does not exist in DB yet.
    // Cognito sends the confirmation email automatically.
    return this.cognito.signUp(dto);
  }

  async confirmEmail(dto: ConfirmEmailDto) {
    // Step 1: Confirm the Cognito user (marks them CONFIRMED in Cognito)
    await this.cognito.confirmSignUp(dto);

    // Step 2: Fetch the Cognito sub — only available after confirmation
    const cognitoSub = await this.cognito.adminGetUser(dto.email);

    // Step 3: Create the users row using system context (bypasses RLS)
    // ON CONFLICT DO NOTHING makes this idempotent if called twice
    await this.db.withSystemContext(async (tx) => {
      await tx
        .insert(users)
        .values({
          id: generateId('user'),
          email: dto.email,
          cognitoSub,
        })
        .onConflictDoNothing({ target: users.cognitoSub });
    });

    return { success: true };
  }

  async resendConfirmationCode(dto: ResendConfirmationDto) {
    await this.cognito.resendConfirmationCode(dto);
    return { success: true };
  }

  async signIn(dto: SignInDto) {
    return this.cognito.signIn(dto);
  }

  async respondToMfaChallenge(dto: MfaChallengeDto) {
    return this.cognito.respondToMfaChallenge(dto);
  }

  async associateSoftwareToken(accessToken: string) {
    return this.cognito.associateSoftwareToken(accessToken);
  }

  async verifyMfa(dto: VerifyMfaDto, accessToken: string) {
    const result = await this.cognito.verifySoftwareToken(accessToken, dto);
    // Immediately enable MFA preference on successful verification
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

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.cognito.forgotPassword(dto);
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.cognito.confirmForgotPassword(dto);
    return { success: true };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    return this.cognito.refreshTokens(dto);
  }

  async signOut(dto: SignOutDto) {
    await this.cognito.signOut(dto);
    return { success: true };
  }
}
