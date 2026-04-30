import { Module, forwardRef } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { CognitoModule } from '../../core/cognito/cognito.module';
import { ObservabilityModule } from '../../core/observability/observability.module';
import { TenantsModule } from '../tenants/tenants.module';
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
import { AdminUsersRepository } from './shared/admin-users.repository';
import { AuthAuditService } from './shared/auth-audit.service';
import { AuthPrincipalGuard } from './shared/auth-principal.guard';
import { AuthPrincipalNormalizerService } from './shared/auth-principal-normalizer.service';
import { AuthSessionRepository } from './shared/auth-session.repository';
import { AuthSubjectRevocationsRepository } from './shared/auth-subject-revocations.repository';
import { CognitoAuthGateway } from './shared/cognito-auth.gateway';
import { CustomerUsersRepository } from './shared/customer-users.repository';
import { SessionEnforcementService } from './shared/session-enforcement.service';
import { SessionIssuerService } from './shared/session-issuer.service';
import { SuspiciousAuthTelemetryService } from './shared/suspicious-auth-telemetry.service';

@Module({
  imports: [
    ObservabilityModule,
    CognitoModule,
    forwardRef(() => AuditModule),
    forwardRef(() => TenantsModule),
  ],
  controllers: [
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
    CognitoAuthGateway,
    AuthAuditService,
    AuthPrincipalGuard,
    SuspiciousAuthTelemetryService,
  ],
})
export class AuthModule {}