import { Injectable } from '@nestjs/common';
import { users } from '@sneakereco/db';

import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertUser(input: { id: string; cognitoSub: string; email: string }): Promise<void> {
    await this.db.systemDb
      .insert(users)
      .values(input)
      .onConflictDoNothing({ target: users.cognitoSub });
  }
}
