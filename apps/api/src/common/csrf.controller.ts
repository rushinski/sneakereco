import { randomBytes } from 'node:crypto';

import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { Public } from './decorators/public.decorator';
import { serializeCookie } from './utils/cookies';

@ApiTags('security')
@Controller()
export class CsrfController {
  private readonly secureCookies: boolean;

  constructor(config: ConfigService) {
    this.secureCookies = config.get<string>('NODE_ENV') !== 'development';
  }

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Issue a CSRF token cookie and return the token value' })
  @ApiResponse({ status: 200, description: 'CSRF token issued.' })
  issueCsrfToken(@Res({ passthrough: true }) response: Response) {
    const token = randomBytes(32).toString('base64url');

    response.setHeader(
      'Set-Cookie',
      serializeCookie('csrf_token', token, {
        httpOnly: true,
        maxAge: 60 * 60,
        path: '/',
        sameSite: 'Strict',
        secure: this.secureCookies,
      }),
    );

    return { token };
  }
}
