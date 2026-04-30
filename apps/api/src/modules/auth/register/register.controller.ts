import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../shared/auth-rate-limit.decorator';
import type { RegisterDto } from './register.dto';
import { RegisterService } from './register.service';

@Controller('auth/register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  @AuthRateLimit('customer-register')
  register(@Body() body: RegisterDto) {
    return this.registerService.register(body);
  }
}