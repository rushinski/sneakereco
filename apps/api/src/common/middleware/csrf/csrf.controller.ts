import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../../decorators/public.decorator';
import { generateCsrfToken } from './csrf.config';

/**
 * Issues CSRF tokens to the frontend. The token is returned in the response
 * body so the frontend can store it in memory and send it back via the
 * X-CSRF-Token header on state-changing requests.
 *
 * The csrf-csrf package also sets an httpOnly cookie with the HMAC — the
 * frontend never reads that cookie directly.
 */
@ApiTags('security')
@Controller()
export class CsrfController {
  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Issue a CSRF token' })
  @ApiResponse({ status: 200, description: 'CSRF token issued.' })
  issueCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = generateCsrfToken(req, res);
    return { token };
  }
}