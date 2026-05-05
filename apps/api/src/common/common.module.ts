import { Global, Module } from '@nestjs/common';

import { SecurityConfig } from '../config/security.config';
import { RequestHostRepository } from './routing/request-host.repository';
import { RequestHostResolverService } from './routing/request-host-resolver.service';

@Global()
@Module({
  providers: [RequestHostRepository, RequestHostResolverService, SecurityConfig],
  exports: [RequestHostRepository, RequestHostResolverService, SecurityConfig],
})
export class CommonModule {}
