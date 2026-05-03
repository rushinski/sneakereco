import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { TenantResolutionService } from './tenant-domain/tenant-resolution.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantResolutionService: TenantResolutionService) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve a tenant from a hostname (server-to-server, no auth required)' })
  @ApiQuery({ name: 'host', required: true, description: 'Hostname to resolve (e.g. kicks.sneakereco.com)' })
  async resolveHost(@Query('host') host: string) {
    if (!host) {
      throw new NotFoundException('host query parameter is required');
    }
    const result = await this.tenantResolutionService.resolveFromHost(host);
    if (!result || !result.tenantId) {
      throw new NotFoundException('Tenant not found for host');
    }
    return result;
  }
}
