import { Module } from '@nestjs/common';

import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxRepository } from './outbox.repository';

@Module({
  providers: [OutboxRepository, OutboxDispatcherService],
  exports: [OutboxRepository, OutboxDispatcherService],
})
export class EventsModule {}