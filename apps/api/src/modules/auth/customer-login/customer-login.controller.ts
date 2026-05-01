import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../principals/auth-rate-limit.decorator';
import type { CustomerLoginDto } from './customer-login.dto';
import { CustomerLoginService } from './customer-login.service';

@Controller('auth/login')
export class CustomerLoginController {
  constructor(private readonly customerLoginService: CustomerLoginService) {}

  @Post()
  @AuthRateLimit('customer-login')
  login(@Body() body: CustomerLoginDto) {
    return this.customerLoginService.login(body);
  }
}
