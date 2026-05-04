import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { WebBuilderService } from './web-builder.service';

@Controller('web-builder')
export class WebBuilderController {
  constructor(private readonly webBuilderService: WebBuilderService) {}

  @Post('theme-configs/drafts')
  saveThemeDraft(@Body() body: { tenantId: string; designFamilyId: string; tokens: Record<string, unknown> }) {
    return this.webBuilderService.saveThemeDraft(body);
  }

  @Post('auth-page-configs/drafts')
  saveAuthPageDraft(
    @Body()
    body: {
      tenantId: string;
      pageType: 'login' | 'register' | 'forgot_password' | 'reset_password' | 'verify_email' | 'otp' | 'mfa';
      designFamilyId: string;
      requiredCapabilities: import('./shared/web-builder.types').AuthCapability[];
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
    },
  ) {
    return this.webBuilderService.saveAuthPageDraft(body);
  }

  @Post('email-configs/drafts')
  saveEmailDraft(
    @Body()
    body: {
      tenantId: string;
      emailType: 'verify_email' | 'password_reset' | 'login_otp' | 'setup_invitation';
      designFamilyId: string;
      sections: Array<{ slot: string; variantKey: string }>;
    },
  ) {
    return this.webBuilderService.saveEmailDraft(body);
  }

  @Post('release-sets')
  createReleaseSet(
    @Body()
    body: {
      tenantId: string;
      name: string;
      themeVersionId: string;
      authPageVersionIds: string[];
      emailVersionIds: string[];
    },
  ) {
    return this.webBuilderService.createReleaseSet(body);
  }

  @Post('release-sets/:releaseSetId/schedule')
  scheduleReleaseSet(
    @Param('releaseSetId') releaseSetId: string,
    @Body() body: { scheduledFor: string; actorAdminUserId?: string },
  ) {
    return this.webBuilderService.scheduleReleaseSet({ releaseSetId, ...body });
  }

  @Post('release-sets/:releaseSetId/publish')
  publishReleaseSet(
    @Param('releaseSetId') releaseSetId: string,
    @Body() body: { actorAdminUserId?: string },
  ) {
    return this.webBuilderService.publishReleaseSet({ releaseSetId, ...body });
  }

  @Post('release-sets/rollback')
  rollbackReleaseSet(
    @Body() body: { tenantId: string; targetReleaseSetId: string; actorAdminUserId?: string },
  ) {
    return this.webBuilderService.rollbackReleaseSet(body);
  }

  @Get('editor-contract')
  getEditorContract() {
    return this.webBuilderService.getEditorContract();
  }
}