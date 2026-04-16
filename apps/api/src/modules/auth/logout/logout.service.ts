import { Injectable } from '@nestjs/common';

import { CognitoService } from '../cognito/cognito.service';

@Injectable()
export class LogoutService {
  constructor(private readonly cognito: CognitoService) {}

  async logout(accessToken: string): Promise<{ success: true }> {
    await this.cognito.globalSignOut(accessToken);
    return { success: true };
  }
}
