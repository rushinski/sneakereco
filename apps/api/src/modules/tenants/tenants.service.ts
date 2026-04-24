import { Injectable, NotFoundException } from '@nestjs/common';

import { OnboardingService } from './onboarding/onboarding.service';
import { TenantConfigService } from './tenant-config/tenant-config.service';
import { TenantsRepository } from './tenants.repository';
import type { ListRequestsDto } from './dto/list-requests.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly onboardingService: OnboardingService,
    private readonly tenantConfigService: TenantConfigService,
  ) {}

  listRequests(dto: ListRequestsDto) {
    return this.tenantsRepository.listRequests(dto);
  }

  approveRequest(tenantId: string) {
    return this.onboardingService.approveRequest(tenantId);
  }

  denyRequest(tenantId: string) {
    return this.onboardingService.denyRequest(tenantId);
  }

  async getTenantConfig(input: { host?: string; slug?: string }) {
    const config = await this.tenantConfigService.getConfig(input);
    if (!config) throw new NotFoundException('Tenant not found');
    return config;
  }
}
