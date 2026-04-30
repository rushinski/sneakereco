import { Module } from '@nestjs/common';

import { CacheModule } from '../../cache/cache.module';
import { DatabaseModule } from '../../database/database.module';
import { QueueModule } from '../../queue/queue.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, CacheModule, QueueModule],
  controllers: [HealthController],
})
export class HealthModule {}