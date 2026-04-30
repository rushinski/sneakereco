import { Injectable } from '@nestjs/common';

import type {
  TenantCustomerPoolProvisioningInput,
  TenantCustomerPoolProvisioningResult,
} from './cognito.types';

@Injectable()
export class CognitoTenantFactoryService {
  async provisionTenantCustomerPool(
    _input: TenantCustomerPoolProvisioningInput,
  ): Promise<TenantCustomerPoolProvisioningResult> {
    throw new Error('Tenant customer pool provisioning is not implemented yet.');
  }
}