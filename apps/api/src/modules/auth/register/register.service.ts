import { Injectable, Logger } from '@nestjs/common';
import { generateId } from '@sneakereco/shared';

import { EmailService } from '../../communications/email/email.service';
import { CognitoService } from '../cognito/cognito.service';
import type { PoolCredentials } from '../cognito/cognito.types';
import type { ConfirmEmailDto } from './confirm-email.dto';
import type { RegisterDto } from './register.dto';
import { RegisterRepository } from './register.repository';
import type { ResendConfirmationDto } from './resend-confirmation.dto';

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly cognito: CognitoService,
    private readonly repository: RegisterRepository,
    private readonly email: EmailService,
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
    await this.repository.insertConfirmedUser({
      id: generateId('user'),
      cognitoSub,
      email: dto.email,
    });

    void this.sendWelcomeEmail(dto.email, tenantId);

    return { success: true };
  }

  async resendConfirmationCode(
    dto: ResendConfirmationDto,
    pool: PoolCredentials,
  ): Promise<{ success: true }> {
    await this.cognito.resendConfirmationCode(dto, pool);
    return { success: true };
  }

  private async sendWelcomeEmail(email: string, tenantId: string): Promise<void> {
    try {
      const tenant = await this.repository.findTenantForWelcomeEmail(tenantId);
      if (!tenant) {
        return;
      }

      await this.email.sendCustomerWelcome({
        email,
        tenantName: tenant.name,
        from: `no-reply@auth-${tenant.slug}.sneakereco.com`,
      });
    } catch (error) {
      this.logger.error(
        'Failed to enqueue welcome email',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
