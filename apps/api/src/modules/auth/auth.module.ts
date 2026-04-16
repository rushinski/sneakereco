import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CommunicationsModule } from '../communications/communications.module';

import { CognitoService } from './cognito/cognito.service';
import { JwtStrategyRepository } from './jwt/jwt-strategy.repository';
import { JwtStrategy } from './jwt/jwt.strategy';
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
import { PoolResolverRepository } from './pool-resolver/pool-resolver.repository';
import { PoolResolverService } from './pool-resolver/pool-resolver.service';
import { RefreshController } from './refresh/refresh.controller';
import { RefreshService } from './refresh/refresh.service';
import { RegisterController } from './register/register.controller';
import { RegisterRepository } from './register/register.repository';
import { RegisterService } from './register/register.service';

@Module({
  imports: [PassportModule, CommunicationsModule],
  controllers: [
    LoginController,
    LogoutController,
    MfaChallengeController,
    MfaLifecycleController,
    MfaSetupController,
    PasswordResetController,
    RefreshController,
    RegisterController,
  ],
  providers: [
    CognitoService,
    JwtStrategyRepository,
    JwtStrategy,
    LoginService,
    LogoutService,
    MfaChallengeService,
    MfaLifecycleService,
    MfaSetupService,
    PasswordResetService,
    PoolResolverRepository,
    PoolResolverService,
    RefreshService,
    RegisterRepository,
    RegisterService,
  ],
  exports: [CognitoService],
})
export class AuthModule {}
