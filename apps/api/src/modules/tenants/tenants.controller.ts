import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { TenantsService } from './tenants.service';
import { ListRequestsDtoSchema, type ListRequestsDto } from './dto/list-requests.dto';

@ApiTags('platform')
@Controller({ path: 'platform' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Roles('platform-admin')
  @Get('requests')
  listRequests(@Query(new ZodValidationPipe(ListRequestsDtoSchema)) dto: ListRequestsDto) {
    return this.tenantsService.listRequests(dto);
  }

  @Roles('platform-admin')
  @Post('requests/:tenantId/approve')
  @HttpCode(HttpStatus.OK)
  approveRequest(@Param('tenantId') tenantId: string) {
    return this.tenantsService.approveRequest(tenantId);
  }

  @Roles('platform-admin')
  @Post('requests/:tenantId/deny')
  @HttpCode(HttpStatus.OK)
  denyRequest(@Param('tenantId') tenantId: string) {
    return this.tenantsService.denyRequest(tenantId);
  }

  @Public()
  @Get('config')
  getTenantConfig(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Query('slug') slug: string | undefined,
  ) {
    return this.tenantsService.getTenantConfig((tenantId ?? slug)!);
  }
}
