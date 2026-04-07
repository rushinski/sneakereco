import { Injectable } from '@nestjs/common';
import { generateId } from '@sneakereco/shared';

import { SubscribersRepository } from './subscribers.repository';
import type { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly subscribersRepository: SubscribersRepository) {}

  async subscribe(tenantId: string, dto: SubscribeDto): Promise<{ subscribed: true }> {
    const existing = await this.subscribersRepository.findByEmail(tenantId, dto.email);

    if (existing) {
      // Already subscribed or pending — return success without revealing status
      return { subscribed: true };
    }

    await this.subscribersRepository.insert({
      id: generateId('emailLog'),
      tenantId,
      email: dto.email,
      status: 'pending',
    });

    // TODO: enqueue double opt-in confirmation email via BullMQ

    return { subscribed: true };
  }
}
