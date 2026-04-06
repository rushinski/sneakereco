import { Module } from '@nestjs/common';
import { FeaturedController } from './featured.controller';
import { FeaturedService } from './featured.service';

@Module({
  controllers: [FeaturedController],
  providers: [FeaturedService],
  exports: [FeaturedService],
})
export class FeaturedModule {}
