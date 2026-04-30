import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxRepository } from './outbox.repository';

@Module({
  imports: [QueueModule],
  providers: [OutboxRepository, OutboxDispatcherService],
  exports: [OutboxRepository, OutboxDispatcherService],
})
export class EventsModule {}