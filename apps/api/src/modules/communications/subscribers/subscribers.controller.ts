import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentTenant } from '../../../common/decorators/tenant.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

import { SubscribersService } from './subscribers.service';
import { SubscribeDtoSchema, type SubscribeDto } from './dto/subscribe.dto';

@ApiTags('subscribers')
@Controller({ path: 'subscribe' })
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Subscribe to a tenant newsletter' })
  @ApiResponse({ status: 201, description: 'Subscription recorded.' })
  subscribe(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(SubscribeDtoSchema)) dto: SubscribeDto,
  ) {
    return this.subscribersService.subscribe(tenantId, dto);
  }
}
