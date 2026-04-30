import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../shared/auth-rate-limit.decorator';
import type { RefreshDto } from './refresh.dto';
import { RefreshService } from './refresh.service';

@Controller('auth/refresh')
export class RefreshController {
  constructor(private readonly refreshService: RefreshService) {}

  @Post()
  @AuthRateLimit('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.refreshService.refresh(body);
  }
}