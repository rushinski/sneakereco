import { Module } from '@nestjs/common';

import { CommonModule } from '../common.module';
import { AuthModule } from '../../modules/auth/auth.module';

import { RequestContextMiddleware } from './request-context.middleware';

/**
 * Provides RequestContextMiddleware for DI resolution.
 * Middleware registration is done in AppModule.configure() so that
 * PoolResolverService (exported from AuthModule) is in scope.
 */
@Module({
  imports: [AuthModule, CommonModule],
  providers: [RequestContextMiddleware],
  exports: [RequestContextMiddleware],
})
export class RequestContextModule {}
