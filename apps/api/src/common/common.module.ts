import { Module } from '@nestjs/common';
import { CsrfController } from './middleware/csrf/csrf.controller';

/**
 * Registers HTTP infrastructure controllers that don't belong to any
 * business domain module — currently just the CSRF token endpoint.
 */
@Module({
  controllers: [CsrfController],
})
export class CommonModule {}