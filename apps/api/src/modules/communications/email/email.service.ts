import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import type { Queue } from 'bullmq';

import type { EmailJob } from '../../../jobs/email.processor';
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

  constructor(
    config: ConfigService,
    @InjectQueue('email') private readonly queue: Queue<EmailJob>,
  ) {
    const fromEmail = config.getOrThrow<string>('PLATFORM_FROM_EMAIL');
    const fromName = config.getOrThrow<string>('PLATFORM_FROM_NAME');
    this.platformFrom = `"${fromName}" <${fromEmail}>`;
    this.platformAdminEmail = config.getOrThrow<string>('PLATFORM_ADMIN_EMAIL');

    const transport = config.getOrThrow<string>('MAIL_TRANSPORT');

    if (transport === 'smtp') {
      // Local development: Mailpit listens on localhost:1025 with no auth.
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
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

    await this.enqueue({
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

    await this.enqueue({
      to: input.email,
      subject: `Your SneakerEco invite for ${input.businessName}`,
      html,
      text,
    });
  }

  async sendRequestConfirmation(input: {
    businessName: string;
    email: string;
    fullName: string;
  }): Promise<void> {
    const html = renderTemplate('platform-request-confirmation', {
      businessName: input.businessName,
      fullName: input.fullName,
    });
    const text = [
      `Hi ${input.fullName},`,
      '',
      `Thanks for applying to sell on SneakerEco. We received your request for ${input.businessName}.`,
      'We review all applications manually and will be in touch within a few business days.',
      'If you have any questions in the meantime, reply to this email.',
    ].join('\n');

    await this.enqueue({
      to: input.email,
      subject: `We received your SneakerEco application for ${input.businessName}`,
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

    await this.enqueue({
      to: input.email,
      subject: `SneakerEco request update for ${businessName}`,
      html,
      text,
    });
  }

  // ---------------------------------------------------------------------------
  // Customer auth emails
  // ---------------------------------------------------------------------------

  async sendCustomerWelcome(input: {
    email: string;
    tenantName: string;
    from: string;
  }): Promise<void> {
    const html = renderTemplate('customer-welcome', { tenantName: input.tenantName });
    const text = `Welcome to ${input.tenantName}! Your account is confirmed and ready to use.`;
    await this.enqueue({
      to: input.email,
      subject: `Welcome to ${input.tenantName}`,
      html,
      text,
      from: input.from,
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

  /** Enqueues an email job for async delivery via the BullMQ processor. */
  private async enqueue(options: SendMailOptions): Promise<void> {
    await this.queue.add('send', options);
  }

  /** Low-level transport — called by EmailProcessor only. Not for direct use. */
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
