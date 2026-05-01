import { Injectable } from '@nestjs/common';

import { AuthAuditService } from '../audit/auth-audit.service';
import { CustomerUsersRepository } from '../customer-users/customer-users.repository';
import { CognitoAuthGateway } from '../gateways/cognito-auth.gateway';

@Injectable()
export class ConfirmEmailService {
  constructor(
    private readonly cognitoAuthGateway: CognitoAuthGateway,
    private readonly customerUsersRepository: CustomerUsersRepository,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async confirm(input: { tenantId: string; email: string; code: string }) {
    const confirmation = await this.cognitoAuthGateway.confirmCustomerEmail(input);
    let customerUser =
      (await this.customerUsersRepository.findByTenantAndCognitoSub(
        input.tenantId,
        confirmation.cognitoSub,
      )) ??
      (await this.customerUsersRepository.findByTenantAndEmail(input.tenantId, confirmation.email));

    if (!customerUser) {
      customerUser = await this.customerUsersRepository.create({
        tenantId: input.tenantId,
        email: confirmation.email,
        fullName: confirmation.fullName,
        cognitoSub: confirmation.cognitoSub,
        status: 'active',
      });
    }

    this.authAuditService.record('auth.customer.email_confirmed', {
      tenantId: input.tenantId,
      customerUserId: customerUser.id,
    });

    return {
      status: 'confirmed',
      customerUserId: customerUser.id,
    };
  }
}
