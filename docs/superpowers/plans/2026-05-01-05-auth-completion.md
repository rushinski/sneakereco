# Auth Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing MFA slices (setup, verify-setup, enable, disable), ensure `customer_users` is written on email confirmation (not registration), disable Cognito's default emails, move email templates to separate files, and wire domain events from auth slices to the communications module.

**Architecture:** Each MFA operation is its own vertical slice in `modules/auth/mfa-*/`. Customer DB write moves from registration to the confirm-email slice. Auth slices emit domain events via the outbox instead of calling communications directly. Email templates are React Email components in a `templates/` directory loaded by name through the template registry.

**Tech Stack:** NestJS, AWS Cognito SDK (AssociateSoftwareToken, VerifySoftwareToken, SetUserMFAPreference), React Email or Handlebars for templates, `@sneakereco/db` for the outbox.

**Prerequisites:** Plan 1 (Foundation) and Plan 4 (Repository → Drizzle) must be complete.

---

### Task 1: Ensure `customer_users` DB write occurs on email confirmation, not registration

**Files:**
- Modify: `apps/api/src/modules/auth/register/register.service.ts`
- Modify: `apps/api/src/modules/auth/confirm-email/confirm-email.service.ts`
- Read: `apps/api/src/modules/auth/customer-users/customer-users.repository.ts`

- [ ] **Step 1: Read the current register and confirm-email services**

```bash
cat apps/api/src/modules/auth/register/register.service.ts
cat apps/api/src/modules/auth/confirm-email/confirm-email.service.ts
```

Identify: does `register.service.ts` currently write to `CustomerUsersRepository`? If yes, that write must move.

- [ ] **Step 2: Write a test confirming register does NOT create a customer_users row**

Create `apps/api/src/modules/auth/register/register.service.spec.ts`:

```typescript
// Mock CustomerUsersRepository
const mockCustomerUsersRepo = { create: jest.fn() };
const mockCognitoGateway = { signUpCustomer: jest.fn().mockResolvedValue({ userSub: 'cognito-sub-1' }) };

describe('RegisterService', () => {
  it('calls Cognito signUp but does NOT write to customer_users', async () => {
    // Arrange: build service with mocks
    // Act: call register()
    // Assert: mockCognitoGateway.signUpCustomer called, mockCustomerUsersRepo.create NOT called
    expect(mockCustomerUsersRepo.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to confirm FAIL (if register currently writes to the repo)**

```bash
cd apps/api && pnpm test -- --testPathPattern="register.service"
```

- [ ] **Step 4: Remove any `CustomerUsersRepository` write from `register.service.ts`**

The register flow should only:
1. Call `cognitoAuthGateway.signUpCustomer(tenantPoolId, email, password)` via `CognitoAdminService`
2. Emit a `customer.registration.initiated` domain event to the outbox
3. Return a response telling the client to check their email

It must NOT write to `customer_users`.

- [ ] **Step 5: Write a test confirming confirm-email DOES create a customer_users row**

Create `apps/api/src/modules/auth/confirm-email/confirm-email.service.spec.ts`:

```typescript
const mockCustomerUsersRepo = { create: jest.fn().mockResolvedValue({ id: 'cus_01' }) };
const mockCognitoGateway = {
  confirmCustomerEmail: jest.fn().mockResolvedValue({ success: true }),
  getCustomerUser: jest.fn().mockResolvedValue({ email: 'user@example.com', sub: 'cognito-sub-1' }),
};

describe('ConfirmEmailService', () => {
  it('verifies with Cognito then creates customer_users row', async () => {
    // Act: call confirmEmail(tenantId, tenantPoolId, email, code)
    // Assert: mockCognitoGateway.confirmCustomerEmail called
    // Assert: mockCustomerUsersRepo.create called with { tenantId, email, cognitoSub, status: 'active' }
    expect(mockCustomerUsersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: expect.any(String), status: 'active' }),
    );
  });
});
```

- [ ] **Step 6: Update `confirm-email.service.ts` to write the `customer_users` row**

After successful Cognito confirmation:
```typescript
// In ConfirmEmailService.confirm():
await this.cognitoAuthGateway.confirmCustomerEmail(poolId, email, code);
const cognitoUser = await this.cognitoAuthGateway.getCustomerUser(poolId, email);

await this.customerUsersRepository.create({
  tenantId,
  email,
  cognitoSub: cognitoUser.sub,
  status: 'active',
});

await this.outboxRepository.create({
  eventType: 'customer.email.confirmed',
  payload: { tenantId, email },
});
```

- [ ] **Step 7: Run both tests — confirm PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="register.service|confirm-email.service"
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth/register/
git add apps/api/src/modules/auth/confirm-email/
git commit -m "fix(auth): move customer_users DB write from register to confirm-email"
```

---

### Task 2: Add MFA setup slice

**Files:**
- Create: `apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts`
- Create: `apps/api/src/modules/auth/mfa-setup/mfa-setup.dto.ts`
- Create: `apps/api/src/modules/auth/mfa-setup/mfa-setup.service.ts`
- Create: `apps/api/src/modules/auth/mfa-setup/mfa-setup.service.spec.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Write the failing test for `MfaSetupService`**

Create `apps/api/src/modules/auth/mfa-setup/mfa-setup.service.spec.ts`:

```typescript
const mockCognito = {
  associateSoftwareToken: jest.fn().mockResolvedValue({
    secretCode: 'JBSWY3DPEHPK3PXP',
    session: 'cognito-session-token',
  }),
};

describe('MfaSetupService', () => {
  it('calls AssociateSoftwareToken and returns secret + QR data', async () => {
    // service.initiateSetup(accessToken, userEmail)
    // Expected: returns { secretCode, otpAuthUrl, session }
    // otpAuthUrl should contain the email and 'sneakereco'
    const result = await service.initiateSetup('access-token', 'user@example.com');
    expect(mockCognito.associateSoftwareToken).toHaveBeenCalledWith({ AccessToken: 'access-token' });
    expect(result.secretCode).toBe('JBSWY3DPEHPK3PXP');
    expect(result.otpAuthUrl).toContain('sneakereco');
    expect(result.session).toBe('cognito-session-token');
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

- [ ] **Step 3: Create `mfa-setup.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { CognitoAdminService } from '../../../core/cognito/cognito-admin.service';

export interface MfaSetupInitiateResult {
  secretCode: string;
  otpAuthUrl: string;
  session: string;
}

@Injectable()
export class MfaSetupService {
  constructor(private readonly cognito: CognitoAdminService) {}

  async initiateSetup(accessToken: string, userEmail: string): Promise<MfaSetupInitiateResult> {
    const result = await this.cognito.associateSoftwareToken(accessToken);
    const otpAuthUrl = `otpauth://totp/SneakerEco:${encodeURIComponent(userEmail)}?secret=${result.secretCode}&issuer=SneakerEco`;
    return {
      secretCode: result.secretCode,
      otpAuthUrl,
      session: result.session,
    };
  }
}
```

- [ ] **Step 4: Create `mfa-setup.dto.ts`**

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateMfaSetupDto {
  // No body needed — uses the access token from Authorization header
}

export class MfaSetupResponseDto {
  @ApiProperty() secretCode: string;
  @ApiProperty() otpAuthUrl: string;
  @ApiProperty() session: string;
}
```

- [ ] **Step 5: Create `mfa-setup.controller.ts`**

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MfaSetupService } from './mfa-setup.service';
import { AuthPrincipalGuard } from '../principals/auth-principal.guard';
import { CurrentPrincipal } from '../principals/current-principal.decorator';
import type { AuthPrincipal } from '../principals/auth.types';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@UseGuards(AuthPrincipalGuard)
@Controller('auth/mfa/setup')
export class MfaSetupController {
  constructor(private readonly mfaSetupService: MfaSetupService) {}

  @Post()
  async initiateSetup(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.mfaSetupService.initiateSetup(
      principal.accessToken,
      principal.email,
    );
  }
}
```

- [ ] **Step 6: Register in `auth.module.ts`**

Add `MfaSetupController` and `MfaSetupService` to the `controllers` and `providers` arrays in `auth.module.ts`.

- [ ] **Step 7: Run tests — confirm PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="mfa-setup.service"
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth/mfa-setup/
git add apps/api/src/modules/auth/auth.module.ts
git commit -m "feat(auth): add MFA setup slice (AssociateSoftwareToken)"
```

---

### Task 3: Add MFA verify-setup slice

**Files:**
- Create: `apps/api/src/modules/auth/mfa-verify-setup/mfa-verify-setup.controller.ts`
- Create: `apps/api/src/modules/auth/mfa-verify-setup/mfa-verify-setup.dto.ts`
- Create: `apps/api/src/modules/auth/mfa-verify-setup/mfa-verify-setup.service.ts`
- Create: `apps/api/src/modules/auth/mfa-verify-setup/mfa-verify-setup.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
const mockCognito = {
  verifySoftwareToken: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  setUserMfaPreference: jest.fn().mockResolvedValue({}),
};

describe('MfaVerifySetupService', () => {
  it('verifies TOTP code and enables software token MFA', async () => {
    await service.verifySetup('access-token', 'session-token', '123456');
    expect(mockCognito.verifySoftwareToken).toHaveBeenCalledWith({
      AccessToken: 'access-token',
      Session: 'session-token',
      UserCode: '123456',
    });
    expect(mockCognito.setUserMfaPreference).toHaveBeenCalledWith(
      expect.objectContaining({ SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true } }),
    );
  });

  it('throws if TOTP code is wrong (Cognito returns non-SUCCESS status)', async () => {
    mockCognito.verifySoftwareToken.mockResolvedValue({ status: 'ERROR' });
    await expect(service.verifySetup('token', 'session', 'wrong')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

- [ ] **Step 3: Create `mfa-verify-setup.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { UnauthorizedError } from '../../../common/errors';
import { CognitoAdminService } from '../../../core/cognito/cognito-admin.service';

@Injectable()
export class MfaVerifySetupService {
  constructor(private readonly cognito: CognitoAdminService) {}

  async verifySetup(accessToken: string, session: string, userCode: string): Promise<void> {
    const result = await this.cognito.verifySoftwareToken({ accessToken, session, userCode });
    if (result.status !== 'SUCCESS') {
      throw new UnauthorizedError('MFA verification code was incorrect');
    }
    await this.cognito.setUserMfaPreference({
      accessToken,
      softwareTokenMfaSettings: { enabled: true, preferredMfa: true },
    });
  }
}
```

- [ ] **Step 4: Create DTO and controller following the same pattern as Task 2**

Controller route: `POST /auth/mfa/verify-setup`
Body DTO: `{ session: string; code: string }`

- [ ] **Step 5: Register in `auth.module.ts`, run tests, commit**

```bash
git commit -m "feat(auth): add MFA verify-setup slice (VerifySoftwareToken)"
```

---

### Task 4: Add MFA enable and disable slices

**Files:**
- Create: `apps/api/src/modules/auth/mfa-enable/` (controller, dto, service, spec)
- Create: `apps/api/src/modules/auth/mfa-disable/` (controller, dto, service, spec)

**MFA Enable** (`POST /auth/mfa/enable`):
- Calls `CognitoAdminService.setUserMfaPreference({ accessToken, softwareTokenMfaSettings: { enabled: true, preferredMfa: true } })`
- Customer-only endpoint (admins always have MFA, controlled by setup flow)

**MFA Disable** (`POST /auth/mfa/disable`):
- Calls `CognitoAdminService.setUserMfaPreference({ accessToken, softwareTokenMfaSettings: { enabled: false, preferredMfa: false } })`
- Customer-only endpoint (admins cannot disable MFA via self-serve)
- Guard: reject if `principal.actorType === 'platform_admin' || principal.actorType === 'tenant_admin'`

- [ ] For each slice: write failing test → implement → run passing test → register in module → commit.

```bash
git commit -m "feat(auth): add MFA enable and disable slices"
```

---

### Task 5: Create separate email template files

**Files:**
- Create: `apps/api/src/core/email/templates/` directory with one file per email type
- Modify: `apps/api/src/core/email/email-template-registry.service.ts`

- [ ] **Step 1: Decide template format**

Check if `react-email` is already installed:
```bash
cat apps/api/package.json | grep -i "react-email\|@react-email"
```

If yes: use React Email components. If no: use Handlebars (simpler, no React dependency in the API).

For Handlebars (recommended for NestJS API without React dependency):
```bash
cd apps/api && pnpm add handlebars
```

- [ ] **Step 2: Create template files**

Create one `.hbs` file per email type in `apps/api/src/core/email/templates/`:

`apps/api/src/core/email/templates/customer-email-verification.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">Verify your email address</h1>
    <p>Welcome to {{businessName}}. Enter the code below to confirm your email address.</p>
    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; margin: 24px 0;">
      {{code}}
    </div>
    <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    <p style="color: #666; font-size: 12px; margin-top: 40px;">{{businessName}} · Powered by SneakerEco</p>
  </div>
</body>
</html>
```

`apps/api/src/core/email/templates/customer-otp-login.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your login code</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">Your one-time login code</h1>
    <p>Use the code below to sign in to {{businessName}}.</p>
    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; margin: 24px 0;">
      {{code}}
    </div>
    <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
  </div>
</body>
</html>
```

`apps/api/src/core/email/templates/customer-forgot-password.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your password</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">Reset your password</h1>
    <p>We received a password reset request for your {{businessName}} account.</p>
    <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; margin: 24px 0;">
      {{code}}
    </div>
    <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
  </div>
</body>
</html>
```

`apps/api/src/core/email/templates/onboarding-submission-confirmation.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Application received</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">We received your application</h1>
    <p>Hi {{applicantName}},</p>
    <p>Thank you for applying to list your store on SneakerEco. We've received your application for <strong>{{businessName}}</strong> and our team will review it shortly.</p>
    <p>We'll send you an email when a decision has been made.</p>
    <p style="color: #666; font-size: 12px; margin-top: 40px;">SneakerEco · If you did not submit this application, contact us immediately.</p>
  </div>
</body>
</html>
```

`apps/api/src/core/email/templates/onboarding-approved.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Application approved</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">Your application has been approved</h1>
    <p>Hi {{applicantName}},</p>
    <p>Congratulations — <strong>{{businessName}}</strong> has been approved on SneakerEco.</p>
    <p>Click the link below to set up your account. This link expires in 48 hours and can only be used once.</p>
    <a href="{{setupUrl}}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0; font-weight: 600;">Set up my account</a>
    <p style="color: #666; font-size: 14px;">If the button above does not work, copy this link into your browser:<br>{{setupUrl}}</p>
  </div>
</body>
</html>
```

`apps/api/src/core/email/templates/onboarding-denied.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Application update</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">Application update</h1>
    <p>Hi {{applicantName}},</p>
    <p>After review, we are unable to approve the application for <strong>{{businessName}}</strong> at this time.</p>
    {{#if denialReason}}<p>Reason: {{denialReason}}</p>{{/if}}
    <p>If you believe this decision was made in error, please contact us.</p>
  </div>
</body>
</html>
```

`apps/api/src/core/email/templates/tenant-admin-setup-invitation.hbs`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Set up your admin account</title></head>
<body style="font-family: sans-serif; background: #fff; color: #111; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto;">
    <h1 style="font-size: 24px; font-weight: 600;">Set up your admin account</h1>
    <p>You have been invited to manage <strong>{{businessName}}</strong> on SneakerEco.</p>
    <p>Click the link below to set your password and configure your account. This link expires in 48 hours.</p>
    <a href="{{setupUrl}}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0; font-weight: 600;">Set up my account</a>
  </div>
</body>
</html>
```

- [ ] **Step 3: Update `email-template-registry.service.ts` to load `.hbs` files by name**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

export type EmailTemplateName =
  | 'customer-email-verification'
  | 'customer-otp-login'
  | 'customer-forgot-password'
  | 'onboarding-submission-confirmation'
  | 'onboarding-approved'
  | 'onboarding-denied'
  | 'tenant-admin-setup-invitation';

@Injectable()
export class EmailTemplateRegistryService implements OnModuleInit {
  private readonly templates = new Map<EmailTemplateName, HandlebarsTemplateDelegate>();

  onModuleInit() {
    const templateDir = join(__dirname, 'templates');
    const names: EmailTemplateName[] = [
      'customer-email-verification',
      'customer-otp-login',
      'customer-forgot-password',
      'onboarding-submission-confirmation',
      'onboarding-approved',
      'onboarding-denied',
      'tenant-admin-setup-invitation',
    ];
    for (const name of names) {
      const source = readFileSync(join(templateDir, `${name}.hbs`), 'utf-8');
      this.templates.set(name, Handlebars.compile(source));
    }
  }

  render(name: EmailTemplateName, data: Record<string, unknown>): string {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Email template not found: ${name}`);
    return template(data);
  }
}
```

- [ ] **Step 4: Wire the template files into the NestJS build**

In `apps/api/nest-cli.json` (or equivalent), add assets config so `.hbs` files are copied to `dist/`:

```json
{
  "compilerOptions": {
    "assets": [{ "include": "core/email/templates/**/*.hbs", "outDir": "dist" }]
  }
}
```

- [ ] **Step 5: Write a test for the template registry**

```typescript
describe('EmailTemplateRegistryService', () => {
  it('renders customer-email-verification with code and businessName', () => {
    const html = service.render('customer-email-verification', {
      code: '123456',
      businessName: 'Kicks Store',
    });
    expect(html).toContain('123456');
    expect(html).toContain('Kicks Store');
  });

  it('throws for unknown template name', () => {
    expect(() => service.render('nonexistent' as any, {})).toThrow('Email template not found');
  });
});
```

- [ ] **Step 6: Run tests — confirm PASS**

```bash
cd apps/api && pnpm test -- --testPathPattern="email-template-registry"
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/core/email/templates/
git add apps/api/src/core/email/email-template-registry.service.ts
git commit -m "feat(email): move email templates to separate .hbs files, load by name"
```

---

### Task 6: Wire domain events from auth slices to communications module

**Files:**
- Modify: `apps/api/src/core/events/domain-event.types.ts`
- Modify: `apps/api/src/modules/auth/register/register.service.ts`
- Modify: `apps/api/src/modules/auth/confirm-email/confirm-email.service.ts`
- Modify: `apps/api/src/modules/auth/password-reset/password-reset.service.ts`
- Modify: `apps/api/src/modules/auth/otp/otp.service.ts`
- Modify: `apps/api/src/modules/communications/auth-email/auth-email.service.ts`
- Modify: `apps/api/src/workers/email/email.worker.ts`

- [ ] **Step 1: Define the auth domain event types**

In `apps/api/src/core/events/domain-event.types.ts`, ensure these event types exist:

```typescript
export type DomainEventType =
  | 'customer.registration.initiated'        // triggers verification email
  | 'customer.email.confirmed'               // customer_users row now exists
  | 'customer.otp.requested'                 // triggers OTP email
  | 'customer.password.reset.requested'      // triggers forgot-password email
  | 'tenant.application.submitted'           // triggers submission confirmation email
  | 'tenant.application.approved'            // triggers approval + setup invitation email
  | 'tenant.application.denied'              // triggers denial email
  | 'tenant.admin.setup.invited'             // triggers setup invitation email
  | 'tenant.provisioning.started'
  | 'tenant.provisioning.succeeded'
  | 'tenant.provisioning.failed';

export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  id: string;
  type: T;
  payload: Record<string, unknown>;
  createdAt: string;
}
```

- [ ] **Step 2: Emit `customer.registration.initiated` from `register.service.ts`**

After calling Cognito sign-up, write an outbox event:

```typescript
await this.outboxRepository.create({
  eventType: 'customer.registration.initiated',
  payload: { tenantId, email, businessName },
});
```

- [ ] **Step 3: Emit `customer.otp.requested` from `otp.service.ts`**

After calling Cognito to send the OTP:

```typescript
await this.outboxRepository.create({
  eventType: 'customer.otp.requested',
  payload: { tenantId, email, businessName },
});
```

**Note:** For `customer.registration.initiated` and `customer.otp.requested`, the verification code itself is NOT in the event payload. Cognito delivers the code. SneakerEco delivers the email. The Lambda trigger or Cognito custom message trigger must intercept the code and pass it to the SneakerEco email API instead of Cognito sending it. See Task 7 for disabling Cognito defaults.

- [ ] **Step 4: Update `auth-email.service.ts` to handle auth domain events**

In `apps/api/src/modules/communications/auth-email/auth-email.service.ts`, add handlers for each event type that triggers an email. The service receives the decoded event from the worker and calls `EmailTemplateRegistryService` + `MailTransportService`:

```typescript
async handleEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case 'customer.registration.initiated':
      // Note: actual code comes via Cognito trigger, not this event
      // This event is for auditing / future use
      await this.emailAuditService.record({ eventType: event.type, ...event.payload });
      break;
    case 'tenant.application.submitted':
      await this.sendSubmissionConfirmation(event.payload);
      break;
    case 'tenant.application.approved':
      await this.sendApprovalEmail(event.payload);
      break;
    case 'tenant.application.denied':
      await this.sendDenialEmail(event.payload);
      break;
    case 'tenant.admin.setup.invited':
      await this.sendSetupInvitationEmail(event.payload);
      break;
  }
}
```

- [ ] **Step 5: Wire the email worker to call `auth-email.service.ts`**

In `apps/api/src/workers/email/email.worker.ts`, ensure it fetches pending outbox events of relevant types and dispatches them to `AuthEmailService`:

```typescript
// In the worker's process loop:
const events = await this.outboxRepository.findPendingBatch(10);
for (const event of events) {
  try {
    await this.authEmailService.handleEvent(event);
    await this.outboxRepository.markDispatched(event.id);
  } catch (err) {
    await this.outboxRepository.markFailed(event.id, String(err));
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/core/events/domain-event.types.ts
git add apps/api/src/modules/auth/
git add apps/api/src/modules/communications/
git add apps/api/src/workers/email/
git commit -m "feat(auth): wire domain events from auth slices to communications module"
```

---

### Task 7: Disable Cognito default emails

**Files:**
- `infra/` — Terraform config for admin user pool
- Cognito Lambda trigger (if custom message trigger is used)

- [ ] **Step 1: Confirm how Cognito email delivery is configured**

Check the Cognito user pool configuration in `infra/`:
```bash
find infra/ -name "*.tf" | xargs grep -l "email_configuration\|lambda_config\|custom_message"
```

Also check Terraform config for `EmailConfiguration` — is it using Cognito default or SES?

- [ ] **Step 2: Add a Cognito CustomMessage Lambda trigger**

The CustomMessage Lambda receives the verification code from Cognito and must return it via the SneakerEco email pipeline instead of allowing Cognito to send it directly.

In the Lambda handler (create `infra/lambda/cognito-custom-message/handler.ts` or equivalent):

```typescript
export async function handler(event: CognitoCustomMessageTriggerEvent) {
  if (event.triggerSource === 'CustomMessage_SignUp') {
    // Override with empty codeDeliveryDetails to suppress Cognito email
    // Call SneakerEco API to send the verification email with the code
    const { codeParameter } = event.request;
    const { email } = event.request.userAttributes;

    await fetch(`${process.env.API_BASE_URL}/internal/auth/email/verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`,
      },
      body: JSON.stringify({ email, code: codeParameter, triggerSource: event.triggerSource }),
    });

    // Return the event — Cognito will not send its own email if emailMessage is overridden to empty
    event.response.emailSubject = ' ';
    event.response.emailMessage = ' ';
  }
  return event;
}
```

**Alternative (simpler):** If using SES directly in Cognito configuration, set `EmailSendingAccount = DEVELOPER` in Terraform and configure Cognito not to use its default templates. This is the cleaner approach for production.

- [ ] **Step 3: Add the internal verification endpoint to the API**

In a new `apps/api/src/modules/auth/` internal endpoint (guarded by `OPS_API_TOKEN`):

```typescript
@Controller('internal/auth/email')
export class AuthEmailInternalController {
  @Post('verification')
  async sendVerification(@Body() body: { email: string; code: string; triggerSource: string }) {
    // Render and send verification email via MailTransportService
  }
}
```

- [ ] **Step 4: Test email delivery end-to-end with Mailpit**

Register a customer account in dev mode. Check Mailpit (`http://localhost:8025`) for the verification email. Confirm it uses the SneakerEco template, not Cognito's default.

- [ ] **Step 5: Commit**

```bash
git add infra/
git add apps/api/src/modules/auth/
git commit -m "feat(auth): disable Cognito default emails, route through SneakerEco delivery"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run all auth tests**

```bash
cd apps/api && pnpm test -- --testPathPattern="modules/auth"
```

Expected: all pass including new MFA slice tests.

- [ ] **Step 2: Run all API tests**

```bash
cd apps/api && pnpm test
```

- [ ] **Step 3: Manual flow: register + verify email**

In dev mode, register a customer account. Check Mailpit — confirm SneakerEco-branded verification email arrives (not Cognito default). Verify the email with the code. Confirm `customer_users` row exists in the database.

- [ ] **Step 4: Manual flow: MFA setup**

Log in as a customer. Call `POST /auth/mfa/setup`. Confirm QR code data returned. Scan with authenticator app. Call `POST /auth/mfa/verify-setup` with the 6-digit code. Confirm success.

- [ ] **Step 5: Update master index**

Mark Plan 5 as `Complete` in `docs/superpowers/plans/2026-05-01-00-remediation-master-index.md`.
