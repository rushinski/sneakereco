import { Injectable, UnauthorizedException } from '@nestjs/common';

import { TenantSetupInvitationsRepository } from './tenant-setup-invitations.repository';

@Injectable()
export class SetupSessionService {
  constructor(
    private readonly tenantSetupInvitationsRepository: TenantSetupInvitationsRepository,
  ) {}

  async consume(token: string) {
    const invitation = await this.tenantSetupInvitationsRepository.consume(token);
    if (!invitation) {
      throw new UnauthorizedException('Setup invitation is invalid or expired');
    }

    return {
      status: 'consumed',
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      adminUserId: invitation.adminUserId,
    };
  }
}