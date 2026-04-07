/* eslint-disable @typescript-eslint/consistent-type-imports */
import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityService {
  constructor(private readonly config: ConfigService) {}

  generateCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  shouldUseSecureCookies(): boolean {
    return this.config.get<string>('NODE_ENV') !== 'development';
  }
}
