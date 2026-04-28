import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { generateId } from '@sneakereco/shared';

import type { CustomerRegisteredEvent } from '../../common/events/auth.events';

import { CustomersRepository } from './customers.repository';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly repository: CustomersRepository) {}

  @OnEvent('auth.customer.registered')
  async handleCustomerRegistered(event: CustomerRegisteredEvent): Promise<void> {
    try {
      await this.repository.insertUser({
        id: generateId('user'),
        cognitoSub: event.cognitoSub,
        email: event.email,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create user record cognitoSub=${event.cognitoSub}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
