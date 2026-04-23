import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { AuthListener } from './auth.listener';

@Module({
  imports: [EmailModule],
  providers: [AuthListener],
})
export class ListenersModule {}
