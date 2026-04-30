import { BadRequestException, Injectable } from '@nestjs/common';

import type { AuthPageDraft, EmailDraft, ThemeDraft } from './web-builder.types';

@Injectable()
export class ReleaseSetValidatorService {
  validateConsistency(input: {
    theme: ThemeDraft;
    authPages: AuthPageDraft[];
    emails: EmailDraft[];
  }) {
    const familyIds = new Set([
      input.theme.designFamilyId,
      ...input.authPages.map((page) => page.designFamilyId),
      ...input.emails.map((email) => email.designFamilyId),
    ]);

    if (familyIds.size !== 1) {
      throw new BadRequestException({
        code: 'inconsistent_release_set',
        message: 'Theme, auth pages, and email configs must share one design family',
      });
    }

    if (input.authPages.length === 0 || input.emails.length === 0) {
      throw new BadRequestException({
        code: 'incomplete_release_set',
        message: 'Release set must include at least one auth page and one auth email',
      });
    }
  }
}