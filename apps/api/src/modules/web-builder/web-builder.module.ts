import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthPageDraftsRepository } from './auth-page-config/auth-page-config.repository';
import { DesignFamilyRegistryRepository } from './design-registry/design-registry.repository';
import { EmailDraftsRepository } from './email-config/email-config.repository';
import { PreviewFixturesRepository } from './preview/preview-fixtures.repository';
import { ReleaseHistoryRepository } from './release-sets/release-history.repository';
import { ReleaseSetsRepository } from './release-sets/release-sets.repository';
import { CapabilityContractValidatorService } from './shared/capability-contract-validator.service';
import { ReleaseSetValidatorService } from './shared/release-set-validator.service';
import { ThemeDraftsRepository } from './theme-config/theme-config.repository';
import { WebBuilderController } from './web-builder.controller';
import { WebBuilderService } from './web-builder.service';

@Module({
  imports: [AuditModule],
  controllers: [WebBuilderController],
  providers: [
    WebBuilderService,
    CapabilityContractValidatorService,
    ReleaseSetValidatorService,
    DesignFamilyRegistryRepository,
    PreviewFixturesRepository,
    ThemeDraftsRepository,
    AuthPageDraftsRepository,
    EmailDraftsRepository,
    ReleaseSetsRepository,
    ReleaseHistoryRepository,
  ],
  exports: [
    DesignFamilyRegistryRepository,
    PreviewFixturesRepository,
    ThemeDraftsRepository,
    AuthPageDraftsRepository,
    EmailDraftsRepository,
    ReleaseSetsRepository,
    ReleaseHistoryRepository,
  ],
})
export class WebBuilderModule {}
