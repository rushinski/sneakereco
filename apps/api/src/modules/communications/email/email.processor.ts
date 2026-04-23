import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { EmailService } from './email.service';
import type { EmailJob } from './email.types';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly email: EmailService) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    await this.email.send(job.data);
  }
}
