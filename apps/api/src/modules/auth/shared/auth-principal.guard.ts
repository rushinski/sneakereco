import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthPrincipalNormalizerService } from './auth-principal-normalizer.service';
import { SessionEnforcementService } from './session-enforcement.service';

@Injectable()
export class AuthPrincipalGuard implements CanActivate {
  constructor(
    private readonly authPrincipalNormalizerService: AuthPrincipalNormalizerService,
    private readonly sessionEnforcementService: SessionEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; authPrincipal?: unknown }>();
    const rawPrincipal = request.headers['x-auth-principal'];

    if (!rawPrincipal) {
      throw new UnauthorizedException('Missing auth principal header');
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