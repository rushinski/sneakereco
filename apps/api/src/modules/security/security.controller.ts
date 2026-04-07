/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { serializeCookie } from '../../common/utils/cookies';

import { SecurityService } from './security.service';

@ApiTags('security')
@Controller()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Public()
  @Get('csrf-token')
  @ApiOperation({
    summary: 'Issue a CSRF token cookie and response token',
  })
  @ApiResponse({ status: 200, description: 'CSRF token issued.' })
  issueCsrfToken(@Res({ passthrough: true }) response: Response) {
    const token = this.securityService.generateCsrfToken();

    response.setHeader(
      'Set-Cookie',
      serializeCookie('csrf_token', token, {
        httpOnly: true,
        maxAge: 60 * 60,
        path: '/',
        sameSite: 'Strict',
        secure: this.securityService.shouldUseSecureCookies(),
      }),
    );

    return { token };
  }
}
