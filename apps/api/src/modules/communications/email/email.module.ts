import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'email' })],
  providers: [EmailProcessor, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
