import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { EmailService } from '../modules/communications/email/email.service';

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly email: EmailService) {}

  async process(job: Job<EmailJob>): Promise<void> {
    await this.email.send(job.data);
  }
}
