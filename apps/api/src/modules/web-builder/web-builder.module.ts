import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { WebBuilderController } from './web-builder.controller';
import { WebBuilderService } from './web-builder.service';
import { CapabilityContractValidatorService } from './capability-contract-validator.service';
import { ReleaseSetValidatorService } from './release-set-validator.service';
import { DesignFamilyRegistryRepository } from './design-family-registry.repository';
import { PreviewFixturesRepository } from './preview-fixtures.repository';
import { ThemeDraftsRepository } from './theme-drafts.repository';
import { AuthPageDraftsRepository } from './auth-page-drafts.repository';
import { EmailDraftsRepository } from './email-drafts.repository';
import { ReleaseSetsRepository } from './release-sets.repository';
import { ReleaseHistoryRepository } from './release-history.repository';

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