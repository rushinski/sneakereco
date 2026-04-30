import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { CapabilityContractValidatorService } from './capability-contract-validator.service';
import { DesignFamilyRegistryRepository } from './design-family-registry.repository';
import { EmailDraftsRepository } from './email-drafts.repository';
import { PreviewFixturesRepository } from './preview-fixtures.repository';
import { ReleaseHistoryRepository } from './release-history.repository';
import { ReleaseSetsRepository } from './release-sets.repository';
import { ReleaseSetValidatorService } from './release-set-validator.service';
import { AuthPageDraftsRepository } from './auth-page-drafts.repository';
import { ThemeDraftsRepository } from './theme-drafts.repository';

@Injectable()
export class WebBuilderService {
  constructor(
    private readonly designFamilyRegistryRepository: DesignFamilyRegistryRepository,
    private readonly previewFixturesRepository: PreviewFixturesRepository,
    private readonly themeDraftsRepository: ThemeDraftsRepository,
    private readonly authPageDraftsRepository: AuthPageDraftsRepository,
    private readonly emailDraftsRepository: EmailDraftsRepository,
    private readonly capabilityContractValidatorService: CapabilityContractValidatorService,
    private readonly releaseSetValidatorService: ReleaseSetValidatorService,
    private readonly releaseSetsRepository: ReleaseSetsRepository,
    private readonly releaseHistoryRepository: ReleaseHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async saveThemeDraft(input: { tenantId: string; designFamilyId: string; tokens: Record<string, unknown> }) {
    return this.themeDraftsRepository.save(input);
  }

  async saveAuthPageDraft(input: {
    tenantId: string;
    pageType: 'login' | 'register' | 'forgot_password' | 'reset_password' | 'verify_email' | 'otp' | 'mfa';
    designFamilyId: string;
    requiredCapabilities: import('./web-builder.types').AuthCapability[];
    enabledFeatures: {
      signupEnabled?: boolean;
      forgotPasswordEnabled?: boolean;
      emailVerificationRequired?: boolean;
      otpLoginEnabled?: boolean;
      mfaEnabled?: boolean;
    };
    slotAssignments: Record<string, string>;
    content: Record<string, unknown>;
    expectedEditorVersion?: number;
  }) {
    this.capabilityContractValidatorService.validate({
      pageType: input.pageType,
      capabilities: input.requiredCapabilities,
      enabledFeatures: input.enabledFeatures,
    });

    return this.authPageDraftsRepository.save({
      tenantId: input.tenantId,
      pageType: input.pageType,
      designFamilyId: input.designFamilyId,
      requiredCapabilities: input.requiredCapabilities,
      slotAssignments: input.slotAssignments,
      content: input.content,
    }, input.expectedEditorVersion);
  }

  async saveEmailDraft(input: {
    tenantId: string;
    emailType: 'verify_email' | 'password_reset' | 'login_otp' | 'setup_invitation';
    designFamilyId: string;
    sections: Array<{ slot: string; variantKey: string }>;
  }) {
    return this.emailDraftsRepository.save(input);
  }

  async createReleaseSet(input: {
    tenantId: string;
    name: string;
    themeVersionId: string;
    authPageVersionIds: string[];
    emailVersionIds: string[];
  }) {
    const theme = await this.themeDraftsRepository.findById(input.themeVersionId);
    const authPages = await Promise.all(input.authPageVersionIds.map((id) => this.authPageDraftsRepository.findById(id)));
    const emails = await Promise.all(input.emailVersionIds.map((id) => this.emailDraftsRepository.findById(id)));

    if (!theme || authPages.some((entry) => !entry) || emails.some((entry) => !entry)) {
      throw new NotFoundException('One or more release-set resources were not found');
    }

    this.releaseSetValidatorService.validateConsistency({
      theme,
      authPages: authPages.filter(Boolean) as NonNullable<(typeof authPages)[number]>[],
      emails: emails.filter(Boolean) as NonNullable<(typeof emails)[number]>[],
    });

    return this.releaseSetsRepository.create(input);
  }

  async scheduleReleaseSet(input: { releaseSetId: string; scheduledFor: string; actorAdminUserId?: string }) {
    const releaseSet = await this.releaseSetsRepository.findById(input.releaseSetId);
    if (!releaseSet) {
      throw new NotFoundException('Release set not found');
    }

    const updated = await this.releaseSetsRepository.update(releaseSet.id, {
      status: 'scheduled',
      scheduledFor: input.scheduledFor,
    });
    await this.releaseHistoryRepository.record({
      tenantId: releaseSet.tenantId,
      releaseSetId: releaseSet.id,
      eventType: 'scheduled',
      actorAdminUserId: input.actorAdminUserId,
      summary: `Scheduled for ${input.scheduledFor}`,
    });
    await this.auditService.record({
      eventName: 'web_builder.release_set.scheduled',
      tenantId: releaseSet.tenantId,
      actorType: input.actorAdminUserId ? 'tenant_admin' : undefined,
      actorId: input.actorAdminUserId,
      metadata: {
        releaseSetId: releaseSet.id,
        scheduledFor: input.scheduledFor,
      },
    });
    return updated;
  }

  async publishReleaseSet(input: { releaseSetId: string; actorAdminUserId?: string }) {
    const releaseSet = await this.releaseSetsRepository.findById(input.releaseSetId);
    if (!releaseSet) {
      throw new NotFoundException('Release set not found');
    }

    await this.releaseSetsRepository.archivePublishedForTenant(releaseSet.tenantId);
    const publishedAt = new Date().toISOString();
    const updated = await this.releaseSetsRepository.update(releaseSet.id, {
      status: 'published',
      publishedAt,
    });
    await this.themeDraftsRepository.markStatus(releaseSet.themeVersionId, 'published');
    await Promise.all(releaseSet.authPageVersionIds.map((id) => this.authPageDraftsRepository.markStatus(id, 'published')));
    await Promise.all(releaseSet.emailVersionIds.map((id) => this.emailDraftsRepository.markStatus(id, 'published')));
    await this.releaseHistoryRepository.record({
      tenantId: releaseSet.tenantId,
      releaseSetId: releaseSet.id,
      eventType: 'published',
      actorAdminUserId: input.actorAdminUserId,
      summary: 'Published release set',
    });
    await this.auditService.record({
      eventName: 'web_builder.release_set.published',
      tenantId: releaseSet.tenantId,
      actorType: input.actorAdminUserId ? 'tenant_admin' : undefined,
      actorId: input.actorAdminUserId,
      metadata: {
        releaseSetId: releaseSet.id,
      },
    });
    return updated;
  }

  async rollbackReleaseSet(input: { tenantId: string; targetReleaseSetId: string; actorAdminUserId?: string }) {
    const target = await this.releaseSetsRepository.findById(input.targetReleaseSetId);
    if (!target) {
      throw new NotFoundException('Rollback target not found');
    }

    await this.releaseSetsRepository.archivePublishedForTenant(input.tenantId);
    const rollback = await this.releaseSetsRepository.create({
      tenantId: input.tenantId,
      name: `Rollback to ${target.name}`,
      themeVersionId: target.themeVersionId,
      authPageVersionIds: target.authPageVersionIds,
      emailVersionIds: target.emailVersionIds,
      rolledBackFromReleaseSetId: target.id,
    });
    const published = await this.releaseSetsRepository.update(rollback.id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
    });
    await this.releaseHistoryRepository.record({
      tenantId: input.tenantId,
      releaseSetId: rollback.id,
      eventType: 'rolled_back',
      actorAdminUserId: input.actorAdminUserId,
      summary: `Rolled back to ${target.id}`,
    });
    await this.auditService.record({
      eventName: 'web_builder.release_set.rolled_back',
      tenantId: input.tenantId,
      actorType: input.actorAdminUserId ? 'tenant_admin' : undefined,
      actorId: input.actorAdminUserId,
      metadata: {
        rollbackReleaseSetId: rollback.id,
        targetReleaseSetId: target.id,
      },
    });
    return published;
  }

  async getEditorContract() {
    return {
      previewModes: ['desktop', 'tablet', 'mobile'],
      defaultPreviewMode: 'desktop',
      authPreviewStates: (await this.previewFixturesRepository.listBySurface('auth')).map(
        (fixture) => fixture.stateKey,
      ),
      designFamilies: await this.designFamilyRegistryRepository.list(),
    };
  }
}