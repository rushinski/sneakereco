import { Global, Module } from '@nestjs/common';
import { OriginResolverService } from './services/origin-resolver.service';
import { SecurityConfig } from '../config/security.config';

@Global()
@Module({
  providers: [OriginResolverService, SecurityConfig],
  exports: [OriginResolverService, SecurityConfig],
})
export class CommonModule {}
