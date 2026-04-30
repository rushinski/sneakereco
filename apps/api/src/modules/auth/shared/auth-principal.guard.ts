import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';

import { AuthPrincipalNormalizerService } from './auth-principal-normalizer.service';
import { SessionEnforcementService } from './session-enforcement.service';
import { ENVIRONMENT } from '../../../core/config/config.module';
import type { Env } from '../../../core/config';
import { verifyPrincipalPayload } from './auth-principal-codec';

@Injectable()
export class AuthPrincipalGuard implements CanActivate {
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Env,
    private readonly authPrincipalNormalizerService: AuthPrincipalNormalizerService,
    private readonly sessionEnforcementService: SessionEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      authPrincipal?: unknown;
    }>();
    const rawPrincipal = request.headers['x-auth-principal'];
    const rawSignature = request.headers['x-auth-principal-signature'];

    if (!rawPrincipal || !rawSignature) {
      throw new UnauthorizedException('Missing auth principal header');
    }

    if (!verifyPrincipalPayload(rawPrincipal, rawSignature, this.env.SESSION_SIGNING_SECRET)) {
      throw new UnauthorizedException('Invalid auth principal signature');
    }

    const claims = JSON.parse(Buffer.from(rawPrincipal, 'base64url').toString('utf8')) as Record<
      string,
      string | string[]
    >;
    const principal = this.authPrincipalNormalizerService.normalize(claims);
    await this.sessionEnforcementService.assertActive(principal);
    request.authPrincipal = principal;

    return true;
  }
}