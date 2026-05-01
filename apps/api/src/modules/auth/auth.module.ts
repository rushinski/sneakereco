import { Module, forwardRef } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { CognitoModule } from '../../core/cognito/cognito.module';
import { ObservabilityModule } from '../../core/observability/observability.module';
import { PlatformOnboardingModule } from '../platform-onboarding/platform-onboarding.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AdminSetupController } from './admin-setup/admin-setup.controller';
import { AdminSetupService } from './admin-setup/admin-setup.service';
import { AdminLoginController } from './admin-login/admin-login.controller';
import { AdminLoginService } from './admin-login/admin-login.service';
import { ConfirmEmailController } from './confirm-email/confirm-email.controller';
import { ConfirmEmailService } from './confirm-email/confirm-email.service';
import { CustomerLoginController } from './customer-login/customer-login.controller';
import { CustomerLoginService } from './customer-login/customer-login.service';
import { LogoutController } from './logout/logout.controller';
import { LogoutService } from './logout/logout.service';
import { MfaChallengeController } from './mfa-challenge/mfa-challenge.controller';
import { MfaChallengeService } from './mfa-challenge/mfa-challenge.service';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';
import { PasswordResetController } from './password-reset/password-reset.controller';
import { PasswordResetService } from './password-reset/password-reset.service';
import { RefreshController } from './refresh/refresh.controller';
import { RefreshService } from './refresh/refresh.service';
import { RegisterController } from './register/register.controller';
import { RegisterService } from './register/register.service';
import { AdminUsersRepository } from './admin-users/admin-users.repository';
import { AuthAuditService } from './audit/auth-audit.service';
import { SuspiciousAuthTelemetryService } from './audit/suspicious-auth-telemetry.service';
import { CustomerUsersRepository } from './customer-users/customer-users.repository';
import { CognitoAuthGateway } from './gateways/cognito-auth.gateway';
import { AuthPrincipalGuard } from './principals/auth-principal.guard';
import { AuthPrincipalNormalizerService } from './principals/auth-principal-normalizer.service';
import { AuthSessionRepository } from './session-control/auth-session.repository';
import { AuthSubjectRevocationsRepository } from './session-control/auth-subject-revocations.repository';
import { SessionEnforcementService } from './session-control/session-enforcement.service';
import { SessionIssuerService } from './session-control/session-issuer.service';

@Module({
  imports: [
    ObservabilityModule,
    CognitoModule,
    forwardRef(() => AuditModule),
    forwardRef(() => TenantsModule),
    forwardRef(() => PlatformOnboardingModule),
  ],
  controllers: [
    AdminSetupController,
    AdminLoginController,
    MfaChallengeController,
    CustomerLoginController,
    RegisterController,
    ConfirmEmailController,
    RefreshController,
    PasswordResetController,
    OtpController,
    LogoutController,
  ],
  providers: [
    AdminSetupService,
    AdminLoginService,
    MfaChallengeService,
    CustomerLoginService,
    RegisterService,
    ConfirmEmailService,
    RefreshService,
    PasswordResetService,
    OtpService,
    LogoutService,
    AdminUsersRepository,
    CustomerUsersRepository,
    AuthSessionRepository,
    AuthSubjectRevocationsRepository,
    AuthPrincipalNormalizerService,
    SessionEnforcementService,
    SessionIssuerService,
    AuthPrincipalGuard,
    AuthAuditService,
    SuspiciousAuthTelemetryService,
    CognitoAuthGateway,
  ],
  exports: [
    AdminUsersRepository,
    CustomerUsersRepository,
    AuthSessionRepository,
    AuthSubjectRevocationsRepository,
    AuthPrincipalNormalizerService,
    SessionEnforcementService,
    SessionIssuerService,
    CognitoAuthGateway,
    AuthAuditService,
    AuthPrincipalGuard,
    SuspiciousAuthTelemetryService,
  ],
})
export class AuthModule {}
