import { Injectable } from '@nestjs/common';

import type { OtpSentResult, OtpVerifyResult } from '../auth.types';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import type { OtpRequestDto } from './otp.dto';
import type { OtpVerifyDto } from './otp.dto';

@Injectable()
export class OtpService {
  constructor(private readonly cognito: CognitoService) {}

  request(dto: OtpRequestDto, pool: PoolCredentials): Promise<OtpSentResult> {
    return this.cognito.initiateEmailOtp(dto.email, pool);
  }

  verify(dto: OtpVerifyDto, pool: PoolCredentials): Promise<OtpVerifyResult> {
    return this.cognito.respondToEmailOtp(
      { email: dto.email, session: dto.session, code: dto.code },
      pool,
    );
  }
}
