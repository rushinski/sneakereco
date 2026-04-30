import { Injectable } from '@nestjs/common';

import { EmailTemplateRegistryService } from './email-template-registry.service';
import type {
  AuthEmailPreviewFixture,
  AuthEmailType,
  RenderedAuthEmail,
  ResolvedSenderIdentity,
} from './email.types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

@Injectable()
export class EmailRendererService {
  constructor(private readonly emailTemplateRegistryService: EmailTemplateRegistryService) {}

  render(input: {
    designFamilyKey: string;
    emailType: AuthEmailType;
    fixture: AuthEmailPreviewFixture;
    sender: ResolvedSenderIdentity;
    businessName: string;
    brandAccent?: string;
  }): RenderedAuthEmail {
    const variant = this.emailTemplateRegistryService.getVariant(input.designFamilyKey, input.emailType);
    const subject = variant.subjectTemplate.replaceAll('{{businessName}}', input.businessName);
    const accent = input.brandAccent ?? (variant.layout === 'bold_dark' ? '#dc2626' : '#151515');

    const html =
      variant.layout === 'bold_dark'
        ? this.renderDark({
            subject,
            fixture: input.fixture,
            businessName: input.businessName,
            accent,
            sender: input.sender,
          })
        : this.renderLight({
            subject,
            fixture: input.fixture,
            businessName: input.businessName,
            accent,
            sender: input.sender,
          });

    const text = [
      subject,
      '',
      input.fixture.headline,
      input.fixture.body,
      input.fixture.code ? `${input.fixture.codeLabel ?? 'Code'}: ${input.fixture.code}` : null,
      input.fixture.ctaHref ? `${input.fixture.ctaLabel ?? 'Open'}: ${input.fixture.ctaHref}` : null,
      input.fixture.footerNote ?? null,
      `Support: ${input.sender.replyTo ?? input.sender.fromEmail}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      subject,
      html,
      text,
      sender: input.sender,
      templateVariant: variant,
      fixture: input.fixture,
    };
  }

  private renderLight(input: {
    subject: string;
    fixture: AuthEmailPreviewFixture;
    businessName: string;
    accent: string;
    sender: ResolvedSenderIdentity;
  }) {
    return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f1ea;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#171412;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e7dfd3;border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 12px 40px;">
                <div style="font-size:12px;letter-spacing:0.35em;text-transform:uppercase;color:#7c7268;">${escapeHtml(input.fixture.preheader)}</div>
                <h1 style="margin:16px 0 10px 0;font-size:34px;line-height:1.05;color:#171412;">${escapeHtml(input.fixture.headline)}</h1>
                <p style="margin:0;font-size:16px;line-height:1.8;color:#5f564c;">${escapeHtml(input.fixture.body)}</p>
              </td>
            </tr>
            ${
              input.fixture.code
                ? `<tr><td style="padding:12px 40px 0 40px;">
                  <div style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#8c8277;">${escapeHtml(input.fixture.codeLabel ?? 'Verification code')}</div>
                  <div style="margin-top:10px;border:1px solid #e7dfd3;border-radius:22px;padding:18px 22px;font-size:38px;font-weight:700;letter-spacing:0.24em;color:${escapeHtml(input.accent)};">${escapeHtml(input.fixture.code)}</div>
                </td></tr>`
                : ''
            }
            ${
              input.fixture.ctaHref
                ? `<tr><td style="padding:22px 40px 0 40px;">
                  <a href="${escapeHtml(input.fixture.ctaHref)}" style="display:inline-block;border-radius:999px;background:${escapeHtml(input.accent)};color:#ffffff;text-decoration:none;padding:14px 20px;font-weight:600;">${escapeHtml(input.fixture.ctaLabel ?? 'Continue')}</a>
                </td></tr>`
                : ''
            }
            <tr>
              <td style="padding:28px 40px 36px 40px;">
                <p style="margin:0;font-size:13px;line-height:1.8;color:#7c7268;">${escapeHtml(input.fixture.footerNote ?? 'If you did not request this email, you can ignore it.')}</p>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #eee6da;">
                  <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#171412;">${escapeHtml(input.businessName)}</div>
                  <div style="margin-top:10px;font-size:14px;color:#5f564c;">${escapeHtml(input.sender.replyTo ?? input.sender.fromEmail)}</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private renderDark(input: {
    subject: string;
    fixture: AuthEmailPreviewFixture;
    businessName: string;
    accent: string;
    sender: ResolvedSenderIdentity;
  }) {
    return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#040404;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:640px;background:#0a0a0c;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 18px 40px;">
                <div style="font-size:12px;letter-spacing:0.4em;text-transform:uppercase;color:${escapeHtml(input.accent)};">${escapeHtml(input.fixture.preheader)}</div>
                <h1 style="margin:18px 0 10px 0;font-size:34px;line-height:1.05;color:#ffffff;">${escapeHtml(input.fixture.headline)}</h1>
                <p style="margin:0;font-size:16px;line-height:1.8;color:#bcc0c9;">${escapeHtml(input.fixture.body)}</p>
              </td>
            </tr>
            ${
              input.fixture.code
                ? `<tr><td style="padding:12px 40px 0 40px;">
                  <div style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#8d93a3;">${escapeHtml(input.fixture.codeLabel ?? 'Verification code')}</div>
                  <div style="margin-top:10px;border:1px solid rgba(255,255,255,0.1);background:#131318;border-radius:20px;padding:18px 22px;font-size:38px;font-weight:700;letter-spacing:0.24em;color:#ffffff;">${escapeHtml(input.fixture.code)}</div>
                </td></tr>`
                : ''
            }
            ${
              input.fixture.ctaHref
                ? `<tr><td style="padding:22px 40px 0 40px;">
                  <a href="${escapeHtml(input.fixture.ctaHref)}" style="display:inline-block;border-radius:999px;background:${escapeHtml(input.accent)};color:#ffffff;text-decoration:none;padding:14px 20px;font-weight:700;">${escapeHtml(input.fixture.ctaLabel ?? 'Continue')}</a>
                </td></tr>`
                : ''
            }
            <tr>
              <td style="padding:28px 40px 36px 40px;">
                <p style="margin:0;font-size:13px;line-height:1.8;color:#8d93a3;">${escapeHtml(input.fixture.footerNote ?? 'If you did not request this email, you can ignore it.')}</p>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffffff;">${escapeHtml(input.businessName)}</div>
                  <div style="margin-top:10px;font-size:14px;color:#bcc0c9;">${escapeHtml(input.sender.replyTo ?? input.sender.fromEmail)}</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}