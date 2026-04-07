import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import { TenantContextService } from './tenant-context.service';

const APP_POOL = 'APP_POOL';
const SYSTEM_POOL = 'SYSTEM_POOL';

@Global()
@Module({
  providers: [
    {
      provide: APP_POOL,
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          min: config.get<number>('DATABASE_POOL_MIN') ?? 2,
          max: config.get<number>('DATABASE_POOL_MAX') ?? 10,
        }),
      inject: [ConfigService],
    },
    {
      provide: SYSTEM_POOL,
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_SYSTEM_URL'),
          min: config.get<number>('DATABASE_POOL_MIN') ?? 2,
          max: config.get<number>('DATABASE_POOL_MAX') ?? 10,
        }),
      inject: [ConfigService],
    },
    {
      provide: DatabaseService,
      useFactory: (appPool: Pool, systemPool: Pool) =>
        new DatabaseService(appPool, systemPool),
      inject: [APP_POOL, SYSTEM_POOL],
    },
    TenantContextService,
  ],
  exports: [DatabaseService, TenantContextService],
})
export class DatabaseModule {}
