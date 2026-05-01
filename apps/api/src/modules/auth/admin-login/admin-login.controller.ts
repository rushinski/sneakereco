import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../principals/auth-rate-limit.decorator';
import type { AdminLoginDto } from './admin-login.dto';
import { AdminLoginService } from './admin-login.service';

@Controller('auth/admin/login')
export class AdminLoginController {
  constructor(private readonly adminLoginService: AdminLoginService) {}

  @Post()
  @AuthRateLimit('admin-login')
  login(@Body() body: AdminLoginDto) {
    return this.adminLoginService.login(body.email, body.password);
  }
}
