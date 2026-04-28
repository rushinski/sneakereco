import { Global, Module } from '@nestjs/common';

import { SecurityConfig } from '../config/security.config';

import { OriginResolverService } from './services/origin-resolver.service';

@Global()
@Module({
  providers: [OriginResolverService, SecurityConfig],
  exports: [OriginResolverService, SecurityConfig],
})
export class CommonModule {}
