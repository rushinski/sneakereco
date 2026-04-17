import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.getOrThrow<string>('LOG_LEVEL'),
          transport:
            config.getOrThrow<string>('NODE_ENV') === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
          customProps: (req) => ({
            requestId: req.headers['x-request-id'],
          }),
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}