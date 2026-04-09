import { Injectable, NotFoundException } from '@nestjs/common';

import { CognitoService } from '../auth/cognito.service';
import { OnboardingService } from './onboarding/onboarding.service';
import { TenantConfigService } from './tenant-config/tenant-config.service';
import { TenantsRepository } from './tenants.repository';
import type { ListRequestsDto } from './dto/list-requests.dto';
import type { PlatformAdminSignInDto } from './dto/platform-admin-sign-in.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly onboardingService: OnboardingService,
    private readonly tenantConfigService: TenantConfigService,
    private readonly cognito: CognitoService,
  ) {}

  signInAdmin(dto: PlatformAdminSignInDto) {
    return this.cognito.signIn({ email: dto.email, password: dto.password, clientType: 'admin' });
  }

  listRequests(dto: ListRequestsDto) {
    return this.tenantsRepository.listRequests(dto);
  }

  approveRequest(tenantId: string) {
    return this.onboardingService.approveRequest(tenantId);
  }

  denyRequest(tenantId: string) {
    return this.onboardingService.denyRequest(tenantId);
  }

  async getTenantConfig(tenantIdOrSlug: string) {
    const config = await this.tenantConfigService.getConfig(tenantIdOrSlug);
    if (!config) throw new NotFoundException('Tenant not found');
    return config;
  }
}
