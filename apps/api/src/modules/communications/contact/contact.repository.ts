import { Injectable } from '@nestjs/common';
import { contactMessages } from '@sneakereco/db';
import type { NewContactMessage } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

@Injectable()
export class ContactRepository {
  constructor(private readonly db: DatabaseService) {}

  async insert(message: NewContactMessage): Promise<void> {
    await this.db.appDb.insert(contactMessages).values(message);
  }
}
