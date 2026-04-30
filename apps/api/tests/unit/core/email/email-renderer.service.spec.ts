import { Test } from '@nestjs/testing';

import { EmailRendererService } from '../../../../src/core/email/email-renderer.service';
import { EmailTemplateRegistryService } from '../../../../src/core/email/email-template-registry.service';

describe('EmailRendererService', () => {
  async function createService() {
    const moduleRef = await Test.createTestingModule({
      providers: [EmailTemplateRegistryService, EmailRendererService],
    }).compile();

    return moduleRef.get(EmailRendererService);
  }

  it('renders the minimal editorial light family with code content', async () => {
    const service = await createService();

    const rendered = service.render({
      designFamilyKey: 'auth-family-a',
      emailType: 'verify_email',
      businessName: 'Heat Kings',
      brandAccent: '#151515',
      sender: {
        id: 'eti_test',
        fromEmail: 'auth@heat-kings.sneakereco.com',
        fromName: 'Heat Kings',
        readinessState: 'managed_subdomain_ready',
        purpose: 'auth',
      },
      fixture: {
        stateKey: 'verification_code',
        subjectLine: 'Confirm your account',
        preheader: 'Verify your email',
        headline: 'Confirm your account',
        body: 'Use this verification code.',
        codeLabel: 'Verification code',
        code: '179157',
      },
    });

    expect(rendered.subject).toBe('Confirm your Heat Kings account');
    expect(rendered.html).toContain('179157');
    expect(rendered.html).toContain('Confirm your account');
    expect(rendered.templateVariant.layout).toBe('editorial_light');
  });

  it('renders the bold dark family with a strong branded layout', async () => {
    const service = await createService();

    const rendered = service.render({
      designFamilyKey: 'auth-family-b',
      emailType: 'login_otp',
      businessName: 'Real Deal Kickz',
      brandAccent: '#dc2626',
      sender: {
        id: 'eti_test',
        fromEmail: 'auth@realdealkickz.com',
        fromName: 'Real Deal Kickz',
        readinessState: 'custom_domain_ready',
        purpose: 'auth',
      },
      fixture: {
        stateKey: 'login_otp_code',
        subjectLine: 'Your sign-in code',
        preheader: 'Email code login',
        headline: 'Finish signing in',
        body: 'Use this one-time code to finish signing in.',
        codeLabel: 'Sign-in code',
        code: '440128',
      },
    });

    expect(rendered.subject).toBe('Your Real Deal Kickz sign-in code');
    expect(rendered.html).toContain('#dc2626');
    expect(rendered.html).toContain('440128');
    expect(rendered.templateVariant.layout).toBe('bold_dark');
  });
});