import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { CsrfController } from './middleware/csrf/csrf.controller';
import { OriginResolverService } from './services/origin-resolver.service';
import { RoleContextService } from './services/role-context.service';
import { SecurityConfig } from '../config/security.config';

/**
 * Registers HTTP infrastructure controllers that don't belong to any
 * business domain module — currently just the CSRF token endpoint.
 */
@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [CsrfController],
  providers: [OriginResolverService, RoleContextService, SecurityConfig],
  exports: [OriginResolverService, RoleContextService, SecurityConfig],
})
export class CommonModule {}
