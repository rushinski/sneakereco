import { Injectable, UnauthorizedException } from '@nestjs/common';

import { SetupSessionService } from '../../platform-onboarding/setup-session/setup-session.service';
import { AdminTenantRelationshipsRepository } from '../../tenants/tenant-admin-relationships/admin-tenant-relationships.repository';
import { TenantRepository } from '../../tenants/tenant-lifecycle/tenant.repository';
import { AuthAuditService } from '../audit/auth-audit.service';
import { AdminUsersRepository } from '../admin-users/admin-users.repository';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';
import { SessionIssuerService } from '../session-control/session-issuer.service';

@Injectable()
export class AdminSetupService {
  constructor(
    private readonly setupSessionService: SetupSessionService,
    private readonly adminUsersRepository: AdminUsersRepository,
    private readonly adminTenantRelationshipsRepository: AdminTenantRelationshipsRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly sessionIssuerService: SessionIssuerService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async begin(input: { setupSessionToken: string; password: string }) {
    const setupSession = await this.setupSessionService.requirePendingPassword(input.setupSessionToken);
    const adminUser = await this.adminUsersRepository.findById(setupSession.adminUserId);
    const relationship = await this.adminTenantRelationshipsRepository.findActiveByAdminUserId(
      setupSession.adminUserId,
    );

    if (!adminUser || !relationship || relationship.tenantId !== setupSession.tenantId) {
      throw new UnauthorizedException('Setup session is not associated with an active tenant admin');
    }

    const challenge = await this.cognitoAuthGateway.beginAdminSetup({
      email: adminUser.email,
      password: input.password,
      tenantId: setupSession.tenantId,
    });

    await this.setupSessionService.markPendingMfa(input.setupSessionToken, challenge.challengeSessionToken);

    return challenge;
  }

  async complete(input: {
    challengeSessionToken: string;
    code: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const setupSession = await this.setupSessionService.requirePendingMfa(input.challengeSessionToken);
    const challenge = await this.cognitoAuthGateway.completeAdminSetup(input);
    const session = await this.sessionIssuerService.issue(challenge, input);

    const completedAt = new Date().toISOString();
    await this.tenantRepository.update(setupSession.tenantId, {
      status: 'active',
      setupCompletedAt: completedAt,
      launchedAt: completedAt,
    });
    await this.setupSessionService.markCompleted(input.challengeSessionToken);

    this.authAuditService.record('auth.admin.setup.completed', {
      tenantId: setupSession.tenantId,
      adminUserId: setupSession.adminUserId,
      sessionId: session.principal.sessionId,
    });

    return session;
  }
}
