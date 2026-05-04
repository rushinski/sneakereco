import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { EmailWorker } from '../email/email.worker';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private draining = false;

  constructor(private readonly emailWorker: EmailWorker) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      await this.emailWorker.drain();
    } catch (err) {
      this.logger.error(`Outbox drain error: ${String(err)}`);
    } finally {
      this.draining = false;
    }
  }
}
