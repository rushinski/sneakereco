import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { CommunicationsModule } from '../modules/communications/communications.module';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
    CommunicationsModule,
  ],
  providers: [EmailProcessor],
})
export class JobsModule {}
