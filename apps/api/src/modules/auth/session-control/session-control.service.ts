import { Injectable } from '@nestjs/common';

import type { PoolCredentials } from '../shared/cognito/cognito.types';
import { CognitoService } from '../shared/cognito/cognito.service';

import { SessionControlRepository } from './session-control.repository';

@Injectable()
export class SessionControlService {
  constructor(
    private readonly repository: SessionControlRepository,
    private readonly cognito: CognitoService,
  ) {}

  async revokeCurrentSession(input: {
    cognitoSub: string;
    userPoolId: string;
    originJti: string | null;
    refreshToken: string | null;
    pool: PoolCredentials;
    surfaceKey: string;
    expiresAt: Date | null;
  }): Promise<{ success: true }> {
    if (input.refreshToken) {
      await this.cognito.revokeToken(input.refreshToken, input.pool.clientId);
    }

    if (input.originJti && input.expiresAt) {
      await this.repository.insertLineageRevocation({
        cognitoSub: input.cognitoSub,
        userPoolId: input.userPoolId,
        originJti: input.originJti,
        surfaceKey: input.surfaceKey,
        expiresAt: input.expiresAt,
      });
    }

    return { success: true };
  }

  async revokeAllSessions(input: {
    cognitoSub: string;
    userPoolId: string;
    revokeBefore?: Date;
  }): Promise<{ success: true }> {
    const revokeBefore = input.revokeBefore ?? new Date();

    await this.repository.upsertSubjectRevocation({
      cognitoSub: input.cognitoSub,
      userPoolId: input.userPoolId,
      revokeBefore,
    });
    await this.cognito.adminGlobalSignOut(input.cognitoSub, input.userPoolId);

    return { success: true };
  }
}
