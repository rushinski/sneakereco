import { Injectable } from '@nestjs/common';

import { CognitoService } from '../cognito/cognito.service';

import { PoolResolverRepository } from './pool-resolver.repository';

export type AdminAudience = 'platform-admin' | 'store-admin' | 'unavailable';

@Injectable()
export class AdminAccountClassifierService {
  constructor(
    private readonly repository: PoolResolverRepository,
    private readonly cognito: CognitoService,
  ) {}

  async classifyForStoreAdminSurface(input: {
    email: string;
    tenantId: string;
  }): Promise<AdminAudience> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const hasStoreMembership = await this.repository.hasStoreAdminMembership(
      input.tenantId,
      normalizedEmail,
    );

    if (hasStoreMembership) {
      return 'store-admin';
    }

    const hasAnyStoreMembership =
      await this.repository.hasAnyStoreAdminMembership(normalizedEmail);

    if (!hasAnyStoreMembership && (await this.cognito.hasPlatformUser(normalizedEmail))) {
      return 'platform-admin';
    }

    return 'unavailable';
  }
}
