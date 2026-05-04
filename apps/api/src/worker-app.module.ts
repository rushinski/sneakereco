import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppModule } from './app.module';
import { EmailWorker } from './workers/email/email.worker';
import { OutboxWorker } from './workers/outbox/outbox.worker';

@Module({
  imports: [ScheduleModule.forRoot(), AppModule],
  providers: [EmailWorker, OutboxWorker],
})
export class WorkerAppModule {}
