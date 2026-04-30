import { Inject, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { Env } from '../config';
import { ENVIRONMENT } from '../config/config.module';

@Injectable()
export class DatabaseService {
  readonly systemPool: Pool;
  readonly appPool: Pool;
  readonly db: ReturnType<typeof drizzle>;

  constructor(@Inject(ENVIRONMENT) private readonly env: Env) {
    this.appPool = new Pool({
      connectionString: env.DATABASE_URL,
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
    });
    this.systemPool = new Pool({
      connectionString: env.DATABASE_SYSTEM_URL,
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
    });
    this.db = drizzle(this.appPool);
  }
}