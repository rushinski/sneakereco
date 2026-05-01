import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthAuditService } from '../audit/auth-audit.service';
import { SuspiciousAuthTelemetryService } from '../audit/suspicious-auth-telemetry.service';
import { AdminUsersRepository } from '../admin-users/admin-users.repository';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';
import { AdminTenantRelationshipsRepository } from '../../tenants/tenant-admin-relationships/admin-tenant-relationships.repository';

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
