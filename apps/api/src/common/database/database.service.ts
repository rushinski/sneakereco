import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '@sneakereco/db';

export type DrizzleTransaction = Parameters<
  Parameters<NodePgDatabase<typeof schema>['transaction']>[0]
>[0];

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly appDb: NodePgDatabase<typeof schema>;
  readonly systemDb: NodePgDatabase<typeof schema>;

  constructor(
    private readonly appPool: Pool,
    private readonly systemPool: Pool,
  ) {
    this.appDb = drizzle(appPool, { schema });
    this.systemDb = drizzle(systemPool, { schema });
  }

  async withTenantContext<T>(
    tenantId: string,
    userId: string,
    role: string,
    fn: (tx: DrizzleTransaction) => Promise<T>,
  ): Promise<T> {
    return this.appDb.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT SET_CONFIG('app.current_tenant_id', ${tenantId}, true)`,
      );
      await tx.execute(
        sql`SELECT SET_CONFIG('app.current_user_id', ${userId}, true)`,
      );
      await tx.execute(
        sql`SELECT SET_CONFIG('app.current_user_role', ${role}, true)`,
      );
      return fn(tx);
    });
  }

  async withSystemContext<T>(
    fn: (tx: DrizzleTransaction) => Promise<T>,
  ): Promise<T> {
    return this.systemDb.transaction(async (tx) => fn(tx));
  }

  async onModuleDestroy(): Promise<void> {
    await this.appPool.end();
    await this.systemPool.end();
  }
}
