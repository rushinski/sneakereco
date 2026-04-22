import { Global, Module } from '@nestjs/common';
import { OriginResolverService } from './services/origin-resolver.service';
import { RoleContextService } from './services/role-context.service';
import { SecurityConfig } from '../config/security.config';

/**
 * Registers HTTP infrastructure controllers that don't belong to any
 * business domain module — currently just the CSRF token endpoint.
 */
@Global()
@Module({
  providers: [OriginResolverService, RoleContextService, SecurityConfig],
  exports: [OriginResolverService, RoleContextService, SecurityConfig],
})
export class CommonModule {}
