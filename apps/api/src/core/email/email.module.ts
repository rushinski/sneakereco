import { Module } from '@nestjs/common';

import { TenantsModule } from '../../modules/tenants/tenants.module';
import { ObservabilityModule } from '../observability/observability.module';
import { EmailRendererService } from './email-renderer.service';
import { EmailTemplateRegistryService } from './email-template-registry.service';
import { MailTransportService } from './mail-transport.service';
import { SenderIdentityService } from './sender-identity.service';
import { SentEmailRepository } from './sent-email.repository';

@Module({
  imports: [ObservabilityModule, TenantsModule],
  providers: [
    EmailTemplateRegistryService,
    EmailRendererService,
    SenderIdentityService,
    SentEmailRepository,
    MailTransportService,
  ],
  exports: [
    EmailTemplateRegistryService,
    EmailRendererService,
    SenderIdentityService,
    SentEmailRepository,
    MailTransportService,
  ],
})
export class EmailModule {}