import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Public } from '../../../common/decorators/public.decorator';

import { CsrfService } from './csrf.service';

@ApiTags('security')
@Controller()
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Issue a CSRF token' })
  @ApiResponse({ status: 200, description: 'CSRF token issued.' })
  issueCsrfToken(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const token = this.csrfService.generateToken(req, res);
    return { token };
  }
}
