import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

import { renderTemplate } from './template.renderer';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Override the From address — used for tenant-scoped transactional emails. */
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Mail;
  private readonly platformFrom: string;
  private readonly platformAdminEmail: string;

  constructor(config: ConfigService) {
    const fromEmail = config.getOrThrow<string>('PLATFORM_FROM_EMAIL');
    const fromName = config.get<string>('PLATFORM_FROM_NAME') ?? 'SneakerEco';
    this.platformFrom = `"${fromName}" <${fromEmail}>`;
    this.platformAdminEmail = config.getOrThrow<string>('PLATFORM_ADMIN_EMAIL');

    const transport = config.get<string>('MAIL_TRANSPORT') ?? 'ses';

    if (transport === 'smtp') {
      // Local development: point SMTP_HOST at Mailpit (port 1025) or MailHog.
      // No credentials required — local mail catchers accept everything.
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('SMTP_HOST') ?? 'localhost',
        port: config.get<number>('SMTP_PORT') ?? 1025,
        secure: config.get<boolean>('SMTP_SECURE') ?? false,
      });
    } else {
      // Staging / Production: AWS SES via SDK v3.
      // nodemailer's @types don't expose the SES transport option in their
      // main overload signatures, so we cast — this is the documented pattern.
      const ses = new SESClient({ region: config.getOrThrow<string>('AWS_REGION') });
      this.transporter = nodemailer.createTransport({
        SES: { ses, aws: { SendEmailCommand } },
      } as Parameters<typeof nodemailer.createTransport>[0]);
    }
  }

  // ---------------------------------------------------------------------------
  // Platform emails
  // ---------------------------------------------------------------------------

  async sendPlatformRequestNotification(input: {
    businessName: string;
    email: string;
    fullName: string;
    instagramHandle: string;
    phoneNumber: string;
  }): Promise<void> {
    const html = renderTemplate('platform-request', {
      businessName: input.businessName,
      email: input.email,
      fullName: input.fullName,
      instagramHandle: input.instagramHandle,
      phoneNumber: input.phoneNumber,
    });
    const text = [
      'A new platform onboarding request was submitted.',
      '',
      `Business:   ${input.businessName}`,
      `Name:       ${input.fullName}`,
      `Email:      ${input.email}`,
      `Phone:      ${input.phoneNumber}`,
      `Instagram:  ${input.instagramHandle}`,
    ].join('\n');

    await this.send({
      to: this.platformAdminEmail,
      subject: `New onboarding request: ${input.businessName}`,
      html,
      text,
    });
  }

  async sendOnboardingInvite(input: {
    adminDomain: string;
    businessName: string;
    email: string;
    fullName: string | null;
    inviteLink: string;
  }): Promise<void> {
    const recipientName = input.fullName ?? 'there';
    const html = renderTemplate('platform-invite', {
      adminDomain: input.adminDomain,
      businessName: input.businessName,
      inviteLink: input.inviteLink,
      recipientName,
    });
    const text = [
      `Hi ${recipientName},`,
      '',
      `Your SneakerEco account request for ${input.businessName} has been approved.`,
      `Finish setup here: ${input.inviteLink}`,
      `Admin dashboard: ${input.adminDomain}`,
    ].join('\n');

    await this.send({
      to: input.email,
      subject: `Your SneakerEco invite for ${input.businessName}`,
      html,
      text,
    });
  }

  async sendOnboardingDenial(input: {
    businessName: string | null;
    email: string;
    fullName: string | null;
  }): Promise<void> {
    const recipientName = input.fullName ?? 'there';
    const businessName = input.businessName ?? 'your store';
    const html = renderTemplate('platform-denial', { businessName, recipientName });
    const text = [
      `Hi ${recipientName},`,
      '',
      'Thanks for your interest in SneakerEco.',
      `We reviewed your request for ${businessName}, but we are not moving forward with it at this time.`,
    ].join('\n');

    await this.send({
      to: input.email,
      subject: `SneakerEco request update for ${businessName}`,
      html,
      text,
    });
  }

  // ---------------------------------------------------------------------------
  // Low-level transport
  // ---------------------------------------------------------------------------

  /**
   * Build a formatted From address for tenant-scoped emails.
   * Pass the result as `from` to send() when emailing on behalf of a tenant.
   */
  buildTenantFrom(fromName: string, fromEmail: string): string {
    return `"${fromName}" <${fromEmail}>`;
  }

  async send(options: SendMailOptions): Promise<void> {
    const from = options.from ?? this.platformFrom;

    this.logger.log(
      `Sending email to="${options.to}" from="${from}" subject="${options.subject}"`,
    );

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(
        `Email accepted messageId="${info.messageId}" to="${options.to}" subject="${options.subject}"`,
      );
    } catch (error) {
      this.logger.error(
        `Email send failed to="${options.to}" subject="${options.subject}"`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
