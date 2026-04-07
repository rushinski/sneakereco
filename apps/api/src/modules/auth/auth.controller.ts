import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from './auth.types';
import {
  SignUpDtoSchema,
  type SignUpDto,
} from './dto/sign-up.dto';
import {
  ConfirmEmailDtoSchema,
  type ConfirmEmailDto,
} from './dto/confirm-email.dto';
import {
  ResendConfirmationDtoSchema,
  type ResendConfirmationDto,
} from './dto/resend-confirmation.dto';
import {
  SignInDtoSchema,
  type SignInDto,
} from './dto/sign-in.dto';
import {
  MfaChallengeDtoSchema,
  type MfaChallengeDto,
} from './dto/mfa-challenge.dto';
import {
  RefreshTokenDtoSchema,
  type RefreshTokenDto,
} from './dto/refresh-token.dto';
import {
  ForgotPasswordDtoSchema,
  type ForgotPasswordDto,
} from './dto/forgot-password.dto';
import {
  ResetPasswordDtoSchema,
  type ResetPasswordDto,
} from './dto/reset-password.dto';
import {
  SignOutDtoSchema,
  type SignOutDto,
} from './dto/sign-out.dto';
import {
  VerifyMfaDtoSchema,
  type VerifyMfaDto,
} from './dto/verify-mfa.dto';
import {
  DisableMfaDtoSchema,
  type DisableMfaDto,
} from './dto/disable-mfa.dto';

@ApiTags('auth')
@Controller({ path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- Public endpoints ---

  @Public()
  @Post('signup')
  signUp(@Body(new ZodValidationPipe(SignUpDtoSchema)) dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirmEmail(
    @Body(new ZodValidationPipe(ConfirmEmailDtoSchema)) dto: ConfirmEmailDto,
  ) {
    return this.authService.confirmEmail(dto);
  }

  @Public()
  @Post('confirm/resend')
  @HttpCode(HttpStatus.OK)
  resendConfirmation(
    @Body(new ZodValidationPipe(ResendConfirmationDtoSchema))
    dto: ResendConfirmationDto,
  ) {
    return this.authService.resendConfirmationCode(dto);
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signIn(@Body(new ZodValidationPipe(SignInDtoSchema)) dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Public()
  @Post('signin/mfa')
  @HttpCode(HttpStatus.OK)
  respondToMfaChallenge(
    @Body(new ZodValidationPipe(MfaChallengeDtoSchema)) dto: MfaChallengeDto,
  ) {
    return this.authService.respondToMfaChallenge(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @Body(new ZodValidationPipe(RefreshTokenDtoSchema)) dto: RefreshTokenDto,
  ) {
    return this.authService.refreshTokens(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordDtoSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordDtoSchema)) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  // --- Protected endpoints (require valid JWT) ---

  @ApiBearerAuth()
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  signOut(
    @Body(new ZodValidationPipe(SignOutDtoSchema)) dto: SignOutDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    return this.authService.signOut(dto);
  }

  @ApiBearerAuth()
  @Post('mfa/associate')
  @HttpCode(HttpStatus.OK)
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
  disableMfa(
    @Body(new ZodValidationPipe(DisableMfaDtoSchema)) dto: DisableMfaDto,
    @Headers('authorization') authHeader: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    return this.authService.disableMfa(dto, accessToken);
  }
}
