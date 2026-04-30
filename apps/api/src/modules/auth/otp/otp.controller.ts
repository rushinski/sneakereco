import { Body, Controller, Post } from '@nestjs/common';

import { AuthRateLimit } from '../shared/auth-rate-limit.decorator';
import type { OtpCompleteDto, OtpRequestDto } from './otp.dto';
import { OtpService } from './otp.service';

@Controller('auth/otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('request')
  @AuthRateLimit('otp-request')
  request(@Body() body: OtpRequestDto) {
    return this.otpService.request(body);
  }

  @Post('complete')
  @AuthRateLimit('otp-complete')
  complete(@Body() body: OtpCompleteDto) {
    return this.otpService.complete(body);
  }
}