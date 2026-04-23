import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthListener } from './listeners/auth.listener';
import { EmailService } from './email/email.service';
import { ContactController } from './contact/contact.controller';
import { ContactRepository } from './contact/contact.repository';
import { ContactService } from './contact/contact.service';
import { SubscribersController } from './subscribers/subscribers.controller';
import { SubscribersRepository } from './subscribers/subscribers.repository';
import { SubscribersService } from './subscribers/subscribers.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'email' })],
  controllers: [ContactController, SubscribersController],
  providers: [
    AuthListener,
    EmailService,
    ContactRepository,
    ContactService,
    SubscribersRepository,
    SubscribersService,
  ],
  exports: [EmailService],
})
export class CommunicationsModule {}
