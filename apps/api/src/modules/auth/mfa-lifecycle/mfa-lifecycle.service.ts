import { Injectable } from '@nestjs/common';

import { CognitoService } from '../shared/cognito/cognito.service';

import type { DisableMfaDto } from './disable-mfa.dto';
import type { VerifyMfaDto } from './verify-mfa.dto';

@Injectable()
export class MfaLifecycleService {
  constructor(private readonly cognito: CognitoService) {}

  associate(accessToken: string) {
    return this.cognito.associateSoftwareToken(accessToken);
  }

  async verify(dto: VerifyMfaDto, accessToken: string) {
    const result = await this.cognito.verifySoftwareToken(accessToken, dto);
    await this.cognito.setUserMfaPreference(accessToken, true);
    return result;
  }

  async enable(accessToken: string): Promise<{ success: true }> {
    await this.cognito.setUserMfaPreference(accessToken, true);
    return { success: true };
  }

  async disable(dto: DisableMfaDto, accessToken: string): Promise<{ success: true }> {
    await this.cognito.verifySoftwareToken(accessToken, { mfaCode: dto.mfaCode });
    await this.cognito.setUserMfaPreference(accessToken, false);
    return { success: true };
  }
}
