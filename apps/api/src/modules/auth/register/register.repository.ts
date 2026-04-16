import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants, users } from '@sneakereco/db';

import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class RegisterRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertConfirmedUser(input: { id: string; cognitoSub: string; email: string }): Promise<void> {
    await this.db.systemDb
      .insert(users)
      .values(input)
      .onConflictDoNothing({ target: users.cognitoSub });
  }

  async findTenantForWelcomeEmail(
    tenantId: string,
  ): Promise<{ slug: string; name: string } | null> {
    const [tenant] = await this.db.systemDb
      .select({ slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return tenant ?? null;
  }
}
