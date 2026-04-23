import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

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
          min: config.getOrThrow<number>('DATABASE_POOL_MIN'),
          max: config.getOrThrow<number>('DATABASE_POOL_MAX'),
        }),
      inject: [ConfigService],
    },
    {
      provide: SYSTEM_POOL,
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_SYSTEM_URL'),
          min: config.getOrThrow<number>('DATABASE_POOL_MIN'),
          max: config.getOrThrow<number>('DATABASE_POOL_MAX'),
        }),
      inject: [ConfigService],
    },
    {
      provide: DatabaseService,
      useFactory: (appPool: Pool, systemPool: Pool) =>
        new DatabaseService(appPool, systemPool),
      inject: [APP_POOL, SYSTEM_POOL],
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
