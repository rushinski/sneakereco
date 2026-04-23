import { Module } from '@nestjs/common';

import { SubscribersController } from './subscribers.controller';
import { SubscribersRepository } from './subscribers.repository';
import { SubscribersService } from './subscribers.service';

@Module({
  controllers: [SubscribersController],
  providers: [SubscribersRepository, SubscribersService],
})
export class SubscribersModule {}
