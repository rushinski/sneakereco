import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthAuditService } from '../shared/auth-audit.service';
import { CognitoAuthGateway } from '../shared/cognito-auth.gateway';
import { AdminUsersRepository } from '../shared/admin-users.repository';
import { SuspiciousAuthTelemetryService } from '../shared/suspicious-auth-telemetry.service';
import { AdminTenantRelationshipsRepository } from '../../tenants/admin-tenant-relationships.repository';

@Injectable()
export class AdminLoginService {
  constructor(
    private readonly adminUsersRepository: AdminUsersRepository,
    private readonly adminTenantRelationshipsRepository: AdminTenantRelationshipsRepository,
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

    const relationship =
      adminUser.adminType === 'tenant_scoped_admin'
        ? await this.adminTenantRelationshipsRepository.findActiveByAdminUserId(adminUser.id)
        : null;

    const challenge = await this.cognitoAuthGateway.adminLogin({
      email,
      password,
      actorType: adminUser.adminType === 'platform_admin' ? 'platform_admin' : 'tenant_admin',
      tenantId: relationship?.tenantId,
    });
    this.authAuditService.record('auth.admin.login.mfa_required', { email, adminUserId: adminUser.id });

    return challenge;
  }
}