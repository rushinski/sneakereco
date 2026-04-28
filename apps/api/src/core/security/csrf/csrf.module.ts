import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CsrfController } from './csrf.controller';
import { CsrfService } from './csrf.service';

@Module({
  imports: [ConfigModule],
  controllers: [CsrfController],
  providers: [CsrfService],
  exports: [CsrfService],
})
export class CsrfModule {}
