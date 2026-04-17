import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { emailSubscribers } from '@sneakereco/db';
import type { EmailSubscriber, NewEmailSubscriber } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

@Injectable()
export class SubscribersRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(tenantId: string, email: string): Promise<EmailSubscriber | undefined> {
    const [row] = await this.db.appDb
      .select()
      .from(emailSubscribers)
      .where(and(eq(emailSubscribers.tenantId, tenantId), eq(emailSubscribers.email, email)))
      .limit(1);
    return row;
  }

  async insert(subscriber: NewEmailSubscriber): Promise<void> {
    await this.db.appDb.insert(emailSubscribers).values(subscriber);
  }

  async updateStatus(
    id: string,
    status: EmailSubscriber['status'],
  ): Promise<void> {
    await this.db.appDb
      .update(emailSubscribers)
      .set({ status, updatedAt: new Date() })
      .where(eq(emailSubscribers.id, id));
  }
}
