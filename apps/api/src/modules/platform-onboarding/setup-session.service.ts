import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { AdminUsersRepository } from '../auth/admin-users/admin-users.repository';
import { TenantSetupInvitationsRepository } from './tenant-setup-invitations.repository';
import type { SetupSessionRecord } from './setup-session.dto';

@Injectable()
export class SetupSessionService {
  private readonly records = new Map<string, SetupSessionRecord>();

  constructor(
    private readonly tenantSetupInvitationsRepository: TenantSetupInvitationsRepository,
    private readonly adminUsersRepository: AdminUsersRepository,
  ) {}

  async consume(token: string) {
    const invitation = await this.tenantSetupInvitationsRepository.consume(token);
    if (!invitation) {
      throw new UnauthorizedException('Setup invitation is invalid or expired');
    }

    const adminUser = await this.adminUsersRepository.findById(invitation.adminUserId);
    if (!adminUser) {
      throw new UnauthorizedException('Setup invitation does not map to a valid admin user');
    }

    const setupSessionToken = randomBytes(24).toString('hex');
    this.records.set(setupSessionToken, {
      id: setupSessionToken,
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      adminUserId: invitation.adminUserId,
      email: adminUser.email,
      status: 'pending_password',
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    });

    return {
      status: 'consumed',
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      adminUserId: invitation.adminUserId,
      setupSessionToken,
    };
  }

  async requirePendingPassword(setupSessionToken: string) {
    const record = this.records.get(setupSessionToken);
    if (!record || record.status !== 'pending_password' || new Date(record.expiresAt) <= new Date()) {
      throw new UnauthorizedException('Setup session is invalid or expired');
    }

    return record;
  }

  async markPendingMfa(setupSessionToken: string, challengeSessionToken: string) {
    const record = await this.requirePendingPassword(setupSessionToken);
    const updated: SetupSessionRecord = {
      ...record,
      status: 'pending_mfa',
      challengeSessionToken,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    this.records.set(setupSessionToken, updated);
    return updated;
  }

  async requirePendingMfa(challengeSessionToken: string) {
    const record =
      [...this.records.values()].find(
        (entry) => entry.challengeSessionToken === challengeSessionToken && entry.status === 'pending_mfa',
      ) ?? null;

    if (!record || new Date(record.expiresAt) <= new Date()) {
      throw new UnauthorizedException('MFA setup session is invalid or expired');
    }

    return record;
  }

  async markCompleted(challengeSessionToken: string) {
    const record = await this.requirePendingMfa(challengeSessionToken);
    const updated: SetupSessionRecord = {
      ...record,
      status: 'completed',
      expiresAt: new Date().toISOString(),
    };
    this.records.set(record.id, updated);
    return updated;
  }
}
