import { Module } from '@nestjs/common';

import { EmailModule } from '../../core/email/email.module';
import { EventsModule } from '../../core/events/events.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { WebBuilderModule } from '../web-builder/web-builder.module';
import { AuthEmailController } from './auth-email.controller';
import { AuthEmailFixturesRepository } from './auth-email-fixtures.repository';
import { AuthEmailService } from './auth-email.service';
import { EmailAuditService } from './email-audit.service';
import { EmailWorker } from '../../workers/email/email.worker';

@Module({
  imports: [EmailModule, EventsModule, AuditModule, AuthModule, TenantsModule, WebBuilderModule],
  controllers: [AuthEmailController],
  providers: [AuthEmailFixturesRepository, AuthEmailService, EmailAuditService, EmailWorker],
  exports: [AuthEmailService, AuthEmailFixturesRepository, EmailAuditService, EmailWorker],
})
export class CommunicationsModule {}