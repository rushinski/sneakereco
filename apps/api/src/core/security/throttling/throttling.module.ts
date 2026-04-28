import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { THROTTLE } from '../../../config/security.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ...THROTTLE.default }],
        storage: new ThrottlerStorageRedisService(config.getOrThrow<string>('VALKEY_URL')),
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlingModule {}
