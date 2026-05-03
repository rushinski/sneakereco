import { Inject, Injectable } from '@nestjs/common';

import type { Env } from '../../../core/config';
import { ENVIRONMENT } from '../../../core/config/config.module';
import { MailTransportService } from '../../../core/email/mail-transport.service';
import { EmailAuditService } from '../email-audit/email-audit.service';

@Injectable()
export class PlatformOnboardingEmailService {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Env,
    private readonly mailTransportService: MailTransportService,
    private readonly emailAuditService: EmailAuditService,
  ) {}

  async sendSubmissionNotifications(input: {
    requestedByName: string;
    requestedByEmail: string;
    businessName: string;
    instagramHandle?: string;
  }) {
    const sender = {
      id: 'platform-onboarding',
      fromEmail: this.env.PLATFORM_FROM_EMAIL,
      fromName: this.env.PLATFORM_FROM_NAME,
      readinessState: 'platform_fallback' as const,
      purpose: 'auth' as const,
    };

    await this.mailTransportService.send({
      toEmail: input.requestedByEmail,
      subject: 'We received your SneakerEco application',
      text: `Hi ${input.requestedByName}, we received your SneakerEco application for ${input.businessName}. We will review it and follow up by email.`,
      html: `<p>Hi ${input.requestedByName},</p><p>We received your SneakerEco application for <strong>${input.businessName}</strong>. We will review it and follow up by email.</p>`,
      sender,
      tags: {
        purpose: 'platform_onboarding',
        emailType: 'application_received',
      },
    });

    await this.mailTransportService.send({
      toEmail: this.env.PLATFORM_ADMIN_EMAIL,
      subject: 'New SneakerEco tenant application request',
      text: `A new tenant application was submitted by ${input.requestedByName} <${input.requestedByEmail}> for ${input.businessName}${input.instagramHandle ? ` (${input.instagramHandle})` : ''}.`,
      html: `<p>A new tenant application was submitted.</p><ul><li>Name: ${input.requestedByName}</li><li>Email: ${input.requestedByEmail}</li><li>Business: ${input.businessName}</li>${input.instagramHandle ? `<li>Instagram: ${input.instagramHandle}</li>` : ''}</ul>`,
      sender,
      tags: {
        purpose: 'platform_onboarding',
        emailType: 'application_admin_notification',
      },
    });

    this.emailAuditService.record('platform.onboarding.application_notifications.sent', {
      toEmail: input.requestedByEmail,
      businessName: input.businessName,
    });
  }

  async sendDeniedNotification(input: {
    requestedByName: string;
    requestedByEmail: string;
    businessName: string;
    denialReason: string;
  }) {
    await this.mailTransportService.send({
      toEmail: input.requestedByEmail,
      subject: 'Your SneakerEco application was not approved',
      text: `Hi ${input.requestedByName}, your application for ${input.businessName} was not approved. ${input.denialReason}`,
      html: `<p>Hi ${input.requestedByName},</p><p>Your application for <strong>${input.businessName}</strong> was not approved.</p><p>${input.denialReason}</p>`,
      sender: {
        id: 'platform-onboarding',
        fromEmail: this.env.PLATFORM_FROM_EMAIL,
        fromName: this.env.PLATFORM_FROM_NAME,
        readinessState: 'platform_fallback',
        purpose: 'auth',
      },
      tags: {
        purpose: 'platform_onboarding',
        emailType: 'application_denied',
      },
    });

    this.emailAuditService.record('platform.onboarding.application_denied.sent', {
      toEmail: input.requestedByEmail,
      businessName: input.businessName,
    });
  }

  async sendApprovedNotification(input: {
    requestedByName: string;
    requestedByEmail: string;
    businessName: string;
    setupUrl: string;
  }) {
    const sender = {
      id: 'platform-onboarding',
      fromEmail: this.env.PLATFORM_FROM_EMAIL,
      fromName: this.env.PLATFORM_FROM_NAME,
      readinessState: 'platform_fallback' as const,
      purpose: 'auth' as const,
    };

    await this.mailTransportService.send({
      toEmail: input.requestedByEmail,
      subject: `Your SneakerEco application for ${input.businessName} was approved`,
      text: `Hi ${input.requestedByName}, congratulations — your application for ${input.businessName} has been approved. Set up your account here: ${input.setupUrl}`,
      html: `<p>Hi ${input.requestedByName},</p><p>Congratulations — <strong>${input.businessName}</strong> has been approved on SneakerEco.</p><p><a href="${input.setupUrl}">Set up my account</a></p><p style="color:#666;font-size:12px">This link expires in 48 hours.</p>`,
      sender,
      tags: {
        purpose: 'platform_onboarding',
        emailType: 'application_approved',
      },
    });

    this.emailAuditService.record('platform.onboarding.application_approved.sent', {
      toEmail: input.requestedByEmail,
      businessName: input.businessName,
    });
  }
}
