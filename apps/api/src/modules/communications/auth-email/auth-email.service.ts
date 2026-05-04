import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { ENVIRONMENT } from '../../../core/config/config.module';
import type { Env } from '../../../core/config/env.schema';
import { EmailRendererService } from '../../../core/email/email-renderer.service';
import { MailTransportService } from '../../../core/email/mail-transport.service';
import { SenderIdentityService } from '../../../core/email/sender-identity.service';
import type { AuthEmailType, RenderedAuthEmail } from '../../../core/email/email.types';
import type { AuthPrincipal } from '../../auth/principals/auth.types';
import { TenantBusinessProfileRepository } from '../../tenants/tenant-business-profile/business-profile.repository';
import { TenantDomainConfigRepository } from '../../tenants/tenant-domain/domain-config.repository';
import { DesignFamilyRegistryRepository } from '../../web-builder/design-registry/design-registry.repository';
import { EmailDraftsRepository } from '../../web-builder/email-config/email-config.repository';
import { ReleaseSetsRepository } from '../../web-builder/release-sets/release-sets.repository';
import { AuthEmailFixturesRepository } from './auth-email-fixtures.repository';
import { EmailAuditService } from '../email-audit/email-audit.service';

@Injectable()
export class AuthEmailService {
  constructor(
    private readonly authEmailFixturesRepository: AuthEmailFixturesRepository,
    private readonly designFamilyRegistryRepository: DesignFamilyRegistryRepository,
    private readonly releaseSetsRepository: ReleaseSetsRepository,
    private readonly emailDraftsRepository: EmailDraftsRepository,
    private readonly tenantBusinessProfileRepository: TenantBusinessProfileRepository,
    private readonly tenantDomainConfigRepository: TenantDomainConfigRepository,
    private readonly senderIdentityService: SenderIdentityService,
    private readonly emailRendererService: EmailRendererService,
    private readonly mailTransportService: MailTransportService,
    private readonly emailAuditService: EmailAuditService,
    @Inject(ENVIRONMENT) private readonly env: Env,
  ) {}

  async preview(input: {
    tenantId?: string;
    emailType: AuthEmailType;
    stateKey: string;
    designFamilyKey?: string;
  }) {
    const rendered = await this.renderEmail(input);
    this.emailAuditService.record('auth.email.preview.generated', {
      tenantId: input.tenantId,
      emailType: input.emailType,
      stateKey: input.stateKey,
      designFamilyKey: rendered.templateVariant.designFamilyKey,
    });

    return {
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
      templateVariant: rendered.templateVariant,
      fixture: rendered.fixture,
    };
  }

  async sendTest(input: {
    principal: AuthPrincipal;
    tenantId?: string;
    toEmail: string;
    emailType: AuthEmailType;
    stateKey: string;
    designFamilyKey?: string;
  }) {
    this.assertCanSend(input.principal, input.tenantId);

    const rendered = await this.renderEmail({
      tenantId: input.tenantId,
      emailType: input.emailType,
      stateKey: input.stateKey,
      designFamilyKey: input.designFamilyKey,
    });

    this.emailAuditService.record('auth.email.test_send.requested', {
      actorType: input.principal.actorType,
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      emailType: input.emailType,
      stateKey: input.stateKey,
    });

    const delivery = await this.mailTransportService.send({
      toEmail: input.toEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
      tags: {
        purpose: 'auth',
        emailType: input.emailType,
      },
    });

    this.emailAuditService.record('auth.email.test_send.completed', {
      emailLogId: delivery.id,
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      emailType: input.emailType,
    });

    return {
      status: 'sent',
      emailLogId: delivery.id,
      sender: rendered.sender,
      subject: rendered.subject,
    };
  }

  async sendSetupInvitation(input: {
    tenantId: string;
    toEmail: string;
    invitationToken: string;
  }) {
    const preview = this.authEmailFixturesRepository.get('setup_invitation');
    const rendered = await this.renderEmail({
      tenantId: input.tenantId,
      emailType: 'setup_invitation',
      stateKey: 'setup_invitation',
      fixtureOverride: {
        ...preview,
        ctaHref: await this.resolveTenantSetupUrl(input.tenantId, input.invitationToken),
      },
    });

    const delivery = await this.mailTransportService.send({
      toEmail: input.toEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sender: rendered.sender,
      tags: {
        purpose: 'auth',
        emailType: 'setup_invitation',
      },
    });

    this.emailAuditService.record('auth.email.setup_invitation.sent', {
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      emailLogId: delivery.id,
    });

    return delivery;
  }

  private assertCanSend(principal: AuthPrincipal, tenantId?: string) {
    if (principal.actorType === 'customer') {
      throw new ForbiddenException('Customers cannot send auth test emails');
    }

    if (principal.actorType === 'tenant_admin' && tenantId && principal.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant admin cannot send test email for another tenant');
    }
  }

  private async renderEmail(input: {
    tenantId?: string;
    emailType: AuthEmailType;
    stateKey: string;
    designFamilyKey?: string;
    fixtureOverride?: ReturnType<AuthEmailFixturesRepository['get']>;
  }) {
    const designFamilyKey =
      input.designFamilyKey ?? (await this.resolvePublishedDesignFamilyKey(input.tenantId, input.emailType));
    const businessProfile = input.tenantId
      ? await this.tenantBusinessProfileRepository.findByTenantId(input.tenantId)
      : null;
    const sender = await this.senderIdentityService.resolve({
      tenantId: input.tenantId,
      purpose: 'auth',
      fallbackFromEmail: this.env.PLATFORM_FROM_EMAIL,
      fallbackFromName: this.env.PLATFORM_FROM_NAME,
    });
    const fixture = input.fixtureOverride ?? this.authEmailFixturesRepository.get(input.stateKey);

    return this.emailRendererService.render({
      designFamilyKey,
      emailType: input.emailType,
      fixture,
      sender,
      businessName: businessProfile?.businessName ?? this.env.PLATFORM_FROM_NAME,
      brandAccent: designFamilyKey === 'auth-family-b' ? '#dc2626' : '#151515',
    });
  }

  private async resolvePublishedDesignFamilyKey(tenantId: string | undefined, emailType: AuthEmailType) {
    if (!tenantId) {
      return 'auth-family-a';
    }

    const publishedReleaseSet = await this.releaseSetsRepository.findPublishedByTenant(tenantId);
    if (publishedReleaseSet) {
      for (const emailVersionId of publishedReleaseSet.emailVersionIds) {
        const draft = await this.emailDraftsRepository.findById(emailVersionId);
        if (draft?.emailType === emailType) {
          const family = await this.designFamilyRegistryRepository.findById(draft.designFamilyId);
          if (family) {
            return family.key;
          }
        }
      }
    }

    const first = (await this.designFamilyRegistryRepository.list())[0];
    if (!first) {
      throw new NotFoundException('No design family available for auth email rendering');
    }

    return first.key;
  }

  private async resolveTenantSetupUrl(tenantId: string, invitationToken: string) {
    const domainConfig = await this.tenantDomainConfigRepository.findByTenantId(tenantId);

    if (domainConfig?.adminDomain && domainConfig.adminReadinessState === 'ready') {
      return `https://${domainConfig.adminDomain}/setup?token=${invitationToken}`;
    }

    if (domainConfig?.subdomain) {
      return `https://${domainConfig.subdomain}/admin/setup?token=${invitationToken}`;
    }

    return `${this.env.PLATFORM_DASHBOARD_URL}/tenants/setup?token=${invitationToken}`;
  }
}
