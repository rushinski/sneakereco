import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CacheModule } from '../../../core/cache/cache.module';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { ValkeyHealthIndicator } from './indicators/valkey.health';

@Module({
  imports: [TerminusModule, CacheModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, ValkeyHealthIndicator],
})
export class HealthModule {}