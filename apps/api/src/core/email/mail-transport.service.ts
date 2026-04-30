import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { LoggerService } from '../observability/logging/logger.service';
import { envSchema } from '../config/env.schema';
import type { SendEmailInput } from './email.types';
import { SentEmailRepository } from './sent-email.repository';

@Injectable()
export class MailTransportService {
  constructor(
    private readonly sentEmailRepository: SentEmailRepository,
    private readonly logger: LoggerService,
  ) {}

  async send(input: SendEmailInput) {
    const env = envSchema.parse(process.env);
    const transport = env.MAIL_TRANSPORT;

    if (transport === 'smtp') {
      const transporter = createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });

      await transporter.sendMail({
        from: `${input.sender.fromName} <${input.sender.fromEmail}>`,
        to: input.toEmail,
        replyTo: input.sender.replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } else {
      const client = new SESClient({ region: env.AWS_REGION });
      await client.send(
        new SendEmailCommand({
          Source: `${input.sender.fromName} <${input.sender.fromEmail}>`,
          ReplyToAddresses: input.sender.replyTo ? [input.sender.replyTo] : undefined,
          Destination: {
            ToAddresses: [input.toEmail],
          },
          Message: {
            Subject: { Data: input.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: input.html, Charset: 'UTF-8' },
              Text: { Data: input.text, Charset: 'UTF-8' },
            },
          },
        }),
      );
    }

    const persisted = await this.sentEmailRepository.recordDelivery({
      ...input,
      transport,
    });

    this.logger.log('Auth email delivered', {
      eventName: 'auth.email.sent',
      tenantId: input.sender.tenantId,
      metadata: {
        emailLogId: persisted.id,
        transport,
        toEmail: input.toEmail,
      },
    });

    return persisted;
  }
}