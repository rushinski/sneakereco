import { BadRequestException } from '@nestjs/common';

import { ReleaseSetValidatorService } from '../../../../src/modules/web-builder/shared/release-set-validator.service';

describe('ReleaseSetValidatorService', () => {
  const service = new ReleaseSetValidatorService();

  it('accepts a consistent release set', () => {
    expect(() =>
      service.validateConsistency({
        theme: {
          id: 'thv_1',
          tenantId: 'tnt_1',
          designFamilyId: 'dsg_1',
          versionNumber: 1,
          status: 'draft',
          tokens: {},
        },
        authPages: [
          {
            id: 'apg_1',
            tenantId: 'tnt_1',
            pageType: 'login',
            designFamilyId: 'dsg_1',
            versionNumber: 1,
            status: 'draft',
            requiredCapabilities: ['primary_sign_in'],
            slotAssignments: {},
            content: {},
            editorVersion: 1,
          },
        ],
        emails: [
          {
            id: 'emv_1',
            tenantId: 'tnt_1',
            emailType: 'verify_email',
            designFamilyId: 'dsg_1',
            versionNumber: 1,
            status: 'draft',
            sections: [],
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects a release set that mixes design families', () => {
    expect(() =>
      service.validateConsistency({
        theme: {
          id: 'thv_1',
          tenantId: 'tnt_1',
          designFamilyId: 'dsg_1',
          versionNumber: 1,
          status: 'draft',
          tokens: {},
        },
        authPages: [
          {
            id: 'apg_1',
            tenantId: 'tnt_1',
            pageType: 'login',
            designFamilyId: 'dsg_2',
            versionNumber: 1,
            status: 'draft',
            requiredCapabilities: ['primary_sign_in'],
            slotAssignments: {},
            content: {},
            editorVersion: 1,
          },
        ],
        emails: [
          {
            id: 'emv_1',
            tenantId: 'tnt_1',
            emailType: 'verify_email',
            designFamilyId: 'dsg_1',
            versionNumber: 1,
            status: 'draft',
            sections: [],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});