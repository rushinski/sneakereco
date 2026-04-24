import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestCtx } from '../../../common/context/request-context';
import { buildSurfaceKey } from '../shared/tokens/auth-cookie';
import { SessionControlService } from '../session-control/session-control.service';
import { PoolResolverService } from '../shared/pool-resolver/pool-resolver.service';

interface AccessTokenPayload {
  sub?: string;
  origin_jti?: string;
  exp?: number;
}

@Injectable()
export class LogoutService {
  constructor(
    private readonly sessionControl: SessionControlService,
    private readonly poolResolver: PoolResolverService,
  ) {}

  async logout(accessToken: string, refreshToken: string | null): Promise<{ success: true }> {
    const ctx = RequestCtx.get();
    if (!ctx || ctx.surface === 'unknown') {
      throw new BadRequestException('Origin not allowed');
    }

    const payload = this.parseAccessToken(accessToken);
    if (!payload.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    const pool =
      ctx.surface === 'platform-admin'
        ? this.poolResolver.getPlatformAdminPool()
        : ctx.surface === 'store-admin'
          ? this.poolResolver.getStoreAdminPool()
          : ctx.pool;
    if (!pool) {
      throw new BadRequestException('Tenant authentication is not configured');
    }

    await this.sessionControl.revokeCurrentSession({
      cognitoSub: payload.sub,
      userPoolId: pool.userPoolId,
      originJti: payload.origin_jti ?? null,
      refreshToken,
      pool,
      surfaceKey: buildSurfaceKey({
        surface: ctx.surface,
        canonicalHost: ctx.canonicalHost,
        host: ctx.host,
      }),
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
    });

    return { success: true };
  }

  private parseAccessToken(token: string): AccessTokenPayload {
    const [, payloadBase64] = token.split('.');

    if (!payloadBase64) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      return JSON.parse(Buffer.from(payloadBase64, 'base64url').toString()) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
