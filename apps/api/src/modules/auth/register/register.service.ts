import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CustomerRegisteredEvent } from '../../../common/events/auth.events';
import { CognitoService } from '../shared/cognito/cognito.service';
import type { PoolCredentials } from '../shared/cognito/cognito.types';
import type { ConfirmEmailDto } from './confirm-email.dto';
import type { RegisterDto } from './register.dto';
import type { ResendConfirmationDto } from './resend-confirmation.dto';

@Injectable()
export class RegisterService {
  constructor(
    private readonly cognito: CognitoService,
    private readonly events: EventEmitter2,
  ) {}

  register(dto: RegisterDto, pool: PoolCredentials) {
    return this.cognito.signUp(dto, pool);
  }

  async confirmEmail(
    dto: ConfirmEmailDto,
    pool: PoolCredentials,
    tenantId: string,
  ): Promise<{ success: true }> {
    await this.cognito.confirmSignUp(dto, pool);

    const cognitoSub = await this.cognito.adminGetUser(dto.email, pool.userPoolId);

    this.events.emit(
      'auth.customer.registered',
      new CustomerRegisteredEvent(cognitoSub, dto.email, tenantId),
    );

    return { success: true };
  }

  async resendConfirmationCode(
    dto: ResendConfirmationDto,
    pool: PoolCredentials,
  ): Promise<{ success: true }> {
    await this.cognito.resendConfirmationCode(dto, pool);
    return { success: true };
  }
}
