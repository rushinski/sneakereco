/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class CommunicationsService {
  private readonly client: SESClient;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly platformAdminEmail: string;

  constructor(private readonly config: ConfigService) {
    this.client = new SESClient({
      region: this.config.get<string>('AWS_REGION') ?? this.config.getOrThrow<string>('AWS_REGION'),
    });
    this.fromEmail = this.config.getOrThrow<string>('PLATFORM_FROM_EMAIL');
    this.fromName = this.config.get<string>('PLATFORM_FROM_NAME') ?? 'SneakerEco';
    this.platformAdminEmail = this.config.getOrThrow<string>('PLATFORM_ADMIN_EMAIL');
  }

  async sendPlatformRequestNotification(input: {
    businessName: string;
    email: string;
    fullName: string;
    instagramHandle: string;
    phoneNumber: string;
  }): Promise<void> {
    await this.sendEmail({
      html: `
        <p>A new platform onboarding request was submitted.</p>
        <ul>
          <li><strong>Business:</strong> ${input.businessName}</li>
          <li><strong>Name:</strong> ${input.fullName}</li>
          <li><strong>Email:</strong> ${input.email}</li>
          <li><strong>Phone:</strong> ${input.phoneNumber}</li>
          <li><strong>Instagram:</strong> ${input.instagramHandle}</li>
        </ul>
      `,
      subject: `New onboarding request: ${input.businessName}`,
      text: [
        'A new platform onboarding request was submitted.',
        `Business: ${input.businessName}`,
        `Name: ${input.fullName}`,
        `Email: ${input.email}`,
        `Phone: ${input.phoneNumber}`,
        `Instagram: ${input.instagramHandle}`,
      ].join('\n'),
      to: this.platformAdminEmail,
    });
  }

  async sendOnboardingInvite(input: {
    adminDomain: string;
    businessName: string | null;
    email: string;
    fullName: string | null;
    inviteLink: string;
  }): Promise<void> {
    const recipientName = input.fullName ?? 'there';

    await this.sendEmail({
      html: `
        <p>Hi ${recipientName},</p>
        <p>Your SneakerEco account request for ${input.businessName ?? 'your store'} has been approved.</p>
        <p>Use the link below to finish creating your admin account and set up MFA:</p>
        <p><a href="${input.inviteLink}">${input.inviteLink}</a></p>
        <p>Your admin dashboard will live at <strong>${input.adminDomain}</strong>.</p>
      `,
      subject: `Your SneakerEco invite for ${input.businessName ?? 'your store'}`,
      text: [
        `Hi ${recipientName},`,
        '',
        `Your SneakerEco account request for ${input.businessName ?? 'your store'} has been approved.`,
        `Finish setup here: ${input.inviteLink}`,
        `Admin dashboard: ${input.adminDomain}`,
      ].join('\n'),
      to: input.email,
    });
  }

  async sendOnboardingDenial(input: {
    businessName: string | null;
    email: string;
    fullName: string | null;
  }): Promise<void> {
    const recipientName = input.fullName ?? 'there';

    await this.sendEmail({
      html: `
        <p>Hi ${recipientName},</p>
        <p>Thanks for your interest in SneakerEco.</p>
        <p>We reviewed your request for ${input.businessName ?? 'your store'}, but we are not moving forward with it at this time.</p>
      `,
      subject: `SneakerEco request update for ${input.businessName ?? 'your store'}`,
      text: [
        `Hi ${recipientName},`,
        '',
        'Thanks for your interest in SneakerEco.',
        `We reviewed your request for ${input.businessName ?? 'your store'}, but we are not moving forward with it at this time.`,
      ].join('\n'),
      to: input.email,
    });
  }

  private async sendEmail(input: {
    html: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: [input.to],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: input.html,
            },
            Text: {
              Charset: 'UTF-8',
              Data: input.text,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: input.subject,
          },
        },
        Source: `"${this.fromName}" <${this.fromEmail}>`,
      }),
    );
  }
}
