import { Module } from '@nestjs/common';

import { CacheModule } from '../../cache/cache.module';
import { DatabaseModule } from '../../database/database.module';
import { EmailModule } from '../../email/email.module';
import { EventsModule } from '../../events/events.module';
import { QueueModule } from '../../queue/queue.module';
import { HealthController } from './health.controller';
import { WorkerHeartbeatService } from './worker-heartbeat.service';

@Module({
  imports: [DatabaseModule, CacheModule, QueueModule, EventsModule, EmailModule],
  controllers: [HealthController],
  providers: [WorkerHeartbeatService],
  exports: [WorkerHeartbeatService],
})
export class HealthModule {}