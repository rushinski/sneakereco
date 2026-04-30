import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { SecurityService } from '../../security/security.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly securityService: SecurityService,
  ) {}

  @Get()
  getMetrics(@Headers('x-ops-token') opsToken?: string) {
    if (!this.securityService.hasValidOpsToken(opsToken)) {
      throw new UnauthorizedException('Missing or invalid ops token');
    }
    
    return this.metricsService.snapshot();
  }
}