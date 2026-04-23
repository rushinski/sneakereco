import { Injectable } from '@nestjs/common';

import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import type { ForgotPasswordDto } from './forgot-password.dto';
import type { ResetPasswordDto } from './reset-password.dto';

@Injectable()
export class PasswordResetService {
  constructor(private readonly cognito: CognitoService) {}

  async forgotPassword(
    dto: ForgotPasswordDto,
    pool: PoolCredentials,
  ): Promise<{ success: true }> {
    await this.cognito.forgotPassword(dto, pool);
    return { success: true };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    pool: PoolCredentials,
  ): Promise<{ success: true }> {
    await this.cognito.confirmForgotPassword(dto, pool);
    return { success: true };
  }
}
