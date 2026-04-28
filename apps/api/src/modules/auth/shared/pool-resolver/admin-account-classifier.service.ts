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

    const groups = await this.cognito.getUserGroups(normalizedEmail);
    if (groups.includes('platform-admin')) {
      return 'platform-admin';
    }

    return 'unavailable';
  }
}
