import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CsrfModule } from '../../core/security/csrf/csrf.module';

import { CognitoService } from './shared/cognito/cognito.service';
import { JwtStrategyRepository } from './shared/jwt/jwt-strategy.repository';
import { JwtStrategy } from './shared/jwt/jwt.strategy';
import { LoginController } from './login/login.controller';
import { LoginService } from './login/login.service';
import { LogoutController } from './logout/logout.controller';
import { LogoutService } from './logout/logout.service';
import { MfaChallengeController } from './mfa-challenge/mfa-challenge.controller';
import { MfaChallengeService } from './mfa-challenge/mfa-challenge.service';
import { MfaLifecycleController } from './mfa-lifecycle/mfa-lifecycle.controller';
import { MfaLifecycleService } from './mfa-lifecycle/mfa-lifecycle.service';
import { MfaSetupController } from './mfa-setup/mfa-setup.controller';
import { MfaSetupService } from './mfa-setup/mfa-setup.service';
import { PasswordResetController } from './password-reset/password-reset.controller';
import { PasswordResetService } from './password-reset/password-reset.service';
import { AdminAccountClassifierService } from './shared/pool-resolver/admin-account-classifier.service';
import { PoolResolverRepository } from './shared/pool-resolver/pool-resolver.repository';
import { PoolResolverService } from './shared/pool-resolver/pool-resolver.service';
import { RefreshController } from './refresh/refresh.controller';
import { RefreshService } from './refresh/refresh.service';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';
import { RegisterController } from './register/register.controller';
import { RegisterService } from './register/register.service';

@Module({
  imports: [PassportModule, CsrfModule],
  controllers: [
    LoginController,
    LogoutController,
    MfaChallengeController,
    MfaLifecycleController,
    MfaSetupController,
    OtpController,
    PasswordResetController,
    RefreshController,
    RegisterController,
  ],
  providers: [
    CognitoService,
    AdminAccountClassifierService,
    JwtStrategyRepository,
    JwtStrategy,
    LoginService,
    LogoutService,
    MfaChallengeService,
    MfaLifecycleService,
    MfaSetupService,
    OtpService,
    PasswordResetService,
    PoolResolverRepository,
    PoolResolverService,
    RefreshService,
    RegisterService,
  ],
  exports: [PoolResolverService],
})
export class AuthModule {}
