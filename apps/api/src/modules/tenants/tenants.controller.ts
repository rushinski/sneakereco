import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { TenantsService } from './tenants.service';
import { ListRequestsDtoSchema, type ListRequestsDto } from './dto/list-requests.dto';

@ApiTags('platform')
@Controller({ path: 'platform' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * List tenant onboarding requests (paginated, filterable by status).
   * Requires super admin JWT from a platform/dashboard origin.
   */
  @UseGuards(PlatformAdminGuard)
  @PlatformAdmin()
  @Get('requests')
  listRequests(@Query(new ZodValidationPipe(ListRequestsDtoSchema)) dto: ListRequestsDto) {
    return this.tenantsService.listRequests(dto);
  }

  /**
   * Approve a pending onboarding request.
   * Sends an invite email with a setup link to apps/web.
   */
  @UseGuards(PlatformAdminGuard)
  @PlatformAdmin()
  @Post('requests/:tenantId/approve')
  @HttpCode(HttpStatus.OK)
  approveRequest(@Param('tenantId') tenantId: string) {
    return this.tenantsService.approveRequest(tenantId);
  }

  /**
   * Deny a pending onboarding request.
   * Sends a denial notification email.
   */
  @UseGuards(PlatformAdminGuard)
  @PlatformAdmin()
  @Post('requests/:tenantId/deny')
  @HttpCode(HttpStatus.OK)
  denyRequest(@Param('tenantId') tenantId: string) {
    return this.tenantsService.denyRequest(tenantId);
  }

  /**
   * Public endpoint — returns tenant config + theme for the admin login page.
   * Accepts tenant ID via X-Tenant-ID header or slug via ?slug= query param.
   */
  @Public()
  @Get('config')
  getTenantConfig(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('slug') slug: string | undefined,
  ) {
    return this.tenantsService.getTenantConfig((tenantId ?? slug)!);
  }
}
