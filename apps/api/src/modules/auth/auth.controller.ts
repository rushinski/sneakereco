import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from './auth.types';
import { SignUpDtoSchema, type SignUpDto } from './dto/sign-up.dto';
import { ConfirmEmailDtoSchema, type ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResendConfirmationDtoSchema, type ResendConfirmationDto } from './dto/resend-confirmation.dto';
import { SignInDtoSchema, type SignInDto } from './dto/sign-in.dto';
import { MfaChallengeDtoSchema, type MfaChallengeDto } from './dto/mfa-challenge.dto';
import { RefreshTokenDtoSchema, type RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDtoSchema, type ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDtoSchema, type ResetPasswordDto } from './dto/reset-password.dto';
import { SignOutDtoSchema, type SignOutDto } from './dto/sign-out.dto';
import { VerifyMfaDtoSchema, type VerifyMfaDto } from './dto/verify-mfa.dto';
import { DisableMfaDtoSchema, type DisableMfaDto } from './dto/disable-mfa.dto';

@ApiTags('auth')
@Controller({ path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration & Confirmation ───────────────────────────────────────────

  @Public()
  @Post('signup')
  @ApiOperation({
    summary: 'Create a new account',
    description:
      'Registers an UNCONFIRMED user in Cognito. No database row is created yet. ' +
      'Cognito automatically sends a 6-digit confirmation code to the email address.',
  })
  @ApiResponse({ status: 201, description: 'Account created. Confirmation email sent.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 409, description: 'An account with this email already exists.' })
  signUp(@Body(new ZodValidationPipe(SignUpDtoSchema)) dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm email address',
    description:
      'Confirms the Cognito user with the 6-digit code from the confirmation email. ' +
      'On success, creates the users row in the database — this is the only place a ' +
      'users row is ever created.',
  })
  @ApiResponse({ status: 200, description: 'Email confirmed. Account is now active.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired confirmation code.' })
  confirmEmail(
    @Body(new ZodValidationPipe(ConfirmEmailDtoSchema)) dto: ConfirmEmailDto,
  ) {
    return this.authService.confirmEmail(dto);
  }

  @Public()
  @Post('confirm/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend confirmation code',
    description:
      'Triggers Cognito to resend the 6-digit confirmation code. Always returns ' +
      'success — the response never reveals whether the email exists in the pool.',
  })
  @ApiResponse({ status: 200, description: 'Confirmation code resent.' })
  @ApiResponse({ status: 400, description: 'Resend limit exceeded.' })
  resendConfirmation(
    @Body(new ZodValidationPipe(ResendConfirmationDtoSchema))
    dto: ResendConfirmationDto,
  ) {
    return this.authService.resendConfirmationCode(dto);
  }

  // ─── Sign In ────────────────────────────────────────────────────────────────

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Authenticates with email + password. Customer accounts return tokens directly. ' +
      'Admin accounts always return an MFA challenge — pass the session to POST /auth/signin/mfa. ' +
      'Returns 400 with a clear message if the account is not yet confirmed.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Tokens (type: "tokens") or MFA challenge (type: "mfa_required", session: string).',
  })
  @ApiResponse({ status: 400, description: 'Email not confirmed.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  signIn(@Body(new ZodValidationPipe(SignInDtoSchema)) dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Public()
  @Post('signin/mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete MFA challenge',
    description:
      'Submits the 6-digit TOTP code to complete sign-in after an MFA challenge. ' +
      'Use the session value returned by POST /auth/signin.',
  })
  @ApiResponse({ status: 200, description: 'Tokens returned.' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code.' })
  respondToMfaChallenge(
    @Body(new ZodValidationPipe(MfaChallengeDtoSchema)) dto: MfaChallengeDto,
  ) {
    return this.authService.respondToMfaChallenge(dto);
  }

  // ─── Token Refresh ──────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Issues a new access token using a valid refresh token. ' +
      'The refresh token itself is not rotated.',
  })
  @ApiResponse({ status: 200, description: 'New access token and ID token returned.' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired. Sign in again.' })
  refreshTokens(
    @Body(new ZodValidationPipe(RefreshTokenDtoSchema)) dto: RefreshTokenDto,
  ) {
    return this.authService.refreshTokens(dto);
  }

  // ─── Password Reset ─────────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Triggers Cognito to send a password reset code to the email address. ' +
      'Always returns success — never reveals whether the email exists.',
  })
  @ApiResponse({ status: 200, description: 'Reset code sent if account exists.' })
  forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordDtoSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with code',
    description:
      'Sets a new password using the 6-digit code from the reset email. ' +
      'Password must contain uppercase, lowercase, number, and special character.',
  })
  @ApiResponse({ status: 200, description: 'Password updated.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset code.' })
  resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordDtoSchema)) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  // ─── Sign Out ────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out',
    description:
      'Calls Cognito GlobalSignOut, which invalidates all tokens (access, refresh, ID) ' +
      'issued to this user across all devices.',
  })
  @ApiResponse({ status: 200, description: 'Signed out. All tokens invalidated.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired access token.' })
  signOut(
    @Body(new ZodValidationPipe(SignOutDtoSchema)) dto: SignOutDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.authService.signOut(dto);
  }

  // ─── MFA Lifecycle ───────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('mfa/associate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Begin TOTP setup',
    description:
      'Returns a secretCode that the frontend encodes as a QR code for the ' +
      'authenticator app (Google Authenticator, Authy, etc.). ' +
      'After scanning, call POST /auth/mfa/verify to activate.',
  })
  @ApiResponse({ status: 200, description: 'secretCode returned for QR code generation.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  associateSoftwareToken(
    @Headers('authorization') authHeader: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.associateSoftwareToken(accessToken);
  }

  @ApiBearerAuth()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify TOTP and activate MFA',
    description:
      'Verifies the 6-digit code from the authenticator app to confirm the setup, ' +
      'then immediately enables TOTP as the preferred MFA method.',
  })
  @ApiResponse({ status: 200, description: 'MFA verified and enabled.' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  verifyMfa(
    @Body(new ZodValidationPipe(VerifyMfaDtoSchema)) dto: VerifyMfaDto,
    @Headers('authorization') authHeader: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.verifyMfa(dto, accessToken);
  }

  @ApiBearerAuth()
  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable MFA',
    description:
      'Re-enables TOTP MFA if it was previously disabled. ' +
      'The authenticator app must already be associated (see POST /auth/mfa/associate).',
  })
  @ApiResponse({ status: 200, description: 'MFA enabled.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  enableMfa(
    @Headers('authorization') authHeader: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.enableMfa(accessToken);
  }

  @ApiBearerAuth()
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable MFA',
    description:
      'Disables TOTP MFA on the account. The admin UI prevents admin users from ' +
      'reaching this endpoint — the API does not enforce user-type restrictions here.',
  })
  @ApiResponse({ status: 200, description: 'MFA disabled.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  disableMfa(
    @Body(new ZodValidationPipe(DisableMfaDtoSchema)) dto: DisableMfaDto,
    @Headers('authorization') authHeader: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.disableMfa(dto, accessToken);
  }
}
