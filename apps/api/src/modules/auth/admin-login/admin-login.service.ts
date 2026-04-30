import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthAuditService } from '../shared/auth-audit.service';
import { CognitoAuthGateway } from '../shared/cognito-auth.gateway';
import { AdminUsersRepository } from '../shared/admin-users.repository';
import { SuspiciousAuthTelemetryService } from '../shared/suspicious-auth-telemetry.service';

@Injectable()
export class AdminLoginService {
  constructor(
    private readonly adminUsersRepository: AdminUsersRepository,
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly authAuditService: AuthAuditService,
    private readonly suspiciousAuthTelemetryService: SuspiciousAuthTelemetryService,
  ) {}

  async login(email: string, password: string) {
    const adminUser = await this.adminUsersRepository.findByEmail(email);

    if (!adminUser) {
      this.authAuditService.record('auth.admin.login.failed', { email, reason: 'not_found' });
      this.suspiciousAuthTelemetryService.record('admin_login_unknown_email', {
        email,
      });
      throw new UnauthorizedException('Admin account not found');
    }

    const challenge = await this.cognitoAuthGateway.adminLogin({ email, password });
    this.authAuditService.record('auth.admin.login.mfa_required', { email, adminUserId: adminUser.id });

    return challenge;
  }
}