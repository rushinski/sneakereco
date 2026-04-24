import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import JwksClient from 'jwks-rsa';

import { ValkeyService } from '../../../../core/valkey/valkey.service';
import { RequestCtx } from '../../../../common/context/request-context';
import type { AuthenticatedUser, CognitoJwtPayload, TeamRole } from '../../auth.types';
import { CognitoService } from '../cognito/cognito.service';
import { JwtStrategyRepository } from './jwt-strategy.repository';
import { buildSurfaceKey } from '../tokens/auth-cookie';

const MFA_CACHE_TTL = 3600;
const MEMBERSHIP_CACHE_TTL = 3600;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly platformIssuer: string;
  private readonly platformPoolId: string;
  private readonly platformClientId: string;
  private readonly storeAdminClientId: string;
  private readonly platformJwksClient: JwksClient.JwksClient;
  private readonly tenantJwksClients = new Map<string, JwksClient.JwksClient>();

  constructor(
    private readonly repository: JwtStrategyRepository,
    private readonly cognito: CognitoService,
    private readonly valkey: ValkeyService,
    config: ConfigService,
  ) {
    const region = config.getOrThrow<string>('AWS_REGION');
    const platformPoolId = config.getOrThrow<string>('PLATFORM_COGNITO_POOL_ID');
    const platformIssuer = `https://cognito-idp.${region}.amazonaws.com/${platformPoolId}`;

    super({
      secretOrKeyProvider: async (
        _request: unknown,
        rawJwtToken: string,
        done: (err: Error | null, secret?: string) => void,
      ) => {
        try {
          const [headerBase64, payloadBase64] = rawJwtToken.split('.');
          const header = JSON.parse(
            Buffer.from(headerBase64 ?? '', 'base64url').toString(),
          ) as Record<string, string>;
          const payload = JSON.parse(
            Buffer.from(payloadBase64 ?? '', 'base64url').toString(),
          ) as Record<string, string>;
          const issuer = payload['iss'];
          const keyId = header['kid'];

          if (!issuer || !keyId) {
            return done(new UnauthorizedException('Malformed token'));
          }

          const publicKey = await this.resolveSigningKey(issuer, keyId);
          done(null, publicKey);
        } catch (error) {
          done(error instanceof Error ? error : new Error(String(error)));
        }
      },
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
    });

    this.platformIssuer = platformIssuer;
    this.platformPoolId = platformPoolId;
    this.platformClientId = config.getOrThrow<string>('PLATFORM_COGNITO_PLATFORM_CLIENT_ID');
    this.storeAdminClientId = config.getOrThrow<string>('PLATFORM_COGNITO_STORE_ADMIN_CLIENT_ID');
    this.platformJwksClient = JwksClient({
      jwksUri: `${platformIssuer}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }

  async validate(payload: CognitoJwtPayload): Promise<AuthenticatedUser> {
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const ctx = RequestCtx.get();
    const surfaceKey =
      ctx && ctx.surface !== 'unknown'
        ? buildSurfaceKey({
            surface: ctx.surface,
            canonicalHost: ctx.canonicalHost,
            host: ctx.host,
          })
        : null;
    await this.assertNotRevoked(payload, surfaceKey);

    if (payload.iss === this.platformIssuer) {
      if (payload.client_id === this.platformClientId) {
        return {
          cognitoSub: payload.sub,
          email: payload.email,
          isSuperAdmin: true,
          tenantId: null,
          memberId: null,
          userType: 'platform-admin',
          teamRole: null,
          jti: payload.jti ?? null,
        };
      }

      if (payload.client_id !== this.storeAdminClientId) {
        throw new UnauthorizedException('Invalid token audience');
      }

      if (ctx?.surface !== 'store-admin' || !ctx.tenantId) {
        throw new UnauthorizedException('Tenant admin token used from an invalid origin');
      }

      const hasMfa = await this.resolveAdminMfa(payload.sub, payload.email, this.platformPoolId);
      if (!hasMfa) {
        throw new ForbiddenException(
          'MFA is required for admin accounts. Complete MFA setup before accessing the admin panel.',
        );
      }

      const membership = await this.resolveMembership(payload.sub, ctx.tenantId);
      if (!membership) {
        throw new UnauthorizedException('User has no tenant membership');
      }

      return {
        cognitoSub: payload.sub,
        email: payload.email,
        isSuperAdmin: false,
        tenantId: membership.tenantId,
        memberId: membership.memberId,
        userType: 'store-admin',
        teamRole: membership.teamRole,
        jti: payload.jti ?? null,
      };
    }

    // Tenant pool — validate against pool from RequestContext
    const pool = ctx?.pool;
    if (!pool) {
      throw new UnauthorizedException('Unknown token issuer');
    }

    if (payload.client_id !== pool.clientId) {
      throw new UnauthorizedException('Invalid token audience');
    }

    if (ctx.surface === 'store-admin') {
      throw new UnauthorizedException('Invalid token audience');
    }

    // Customer — membership lookup for tenantId
    const membership = await this.resolveMembership(payload.sub);

    return {
      cognitoSub: payload.sub,
      email: payload.email,
      isSuperAdmin: false,
      tenantId: ctx.tenantId ?? membership?.tenantId ?? null,
      memberId: membership?.memberId ?? null,
      userType: 'customer',
      teamRole: null,
      jti: payload.jti ?? null,
    };
  }

  async evictUserCache(sub: string): Promise<void> {
    await this.valkey.del(`mfa:${sub}`, `membership:${sub}`);
  }

  private async resolveSigningKey(issuer: string, keyId: string): Promise<string> {
    if (issuer === this.platformIssuer) {
      const key = await this.platformJwksClient.getSigningKey(keyId);
      return key.getPublicKey();
    }

    const poolId = issuer.split('/').pop();
    if (!poolId) {
      throw new UnauthorizedException('Unknown token issuer');
    }

    if (!this.tenantJwksClients.has(poolId)) {
      this.tenantJwksClients.set(
        poolId,
        JwksClient({
          jwksUri: `${issuer}/.well-known/jwks.json`,
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
        }),
      );
    }

    const client = this.tenantJwksClients.get(poolId)!;
    const key = await client.getSigningKey(keyId);
    return key.getPublicKey();
  }

  private async resolveMembership(sub: string, tenantId?: string | null): Promise<{
    tenantId: string;
    teamRole: TeamRole;
    memberId: string;
  } | null> {
    const cacheKey = tenantId ? `membership:${sub}:${tenantId}` : `membership:${sub}`;

    const cached = await this.valkey.getJson<{
      tenantId: string;
      teamRole: TeamRole;
      memberId: string;
    }>(cacheKey);
    if (cached) return cached;

    const membership = tenantId
      ? await this.repository.findMembershipByCognitoSubAndTenant(sub, tenantId)
      : await this.repository.findMembershipByCognitoSub(sub);
    if (!membership) return null;

    const result = {
      tenantId: membership.tenantId,
      teamRole: membership.role as TeamRole,
      memberId: membership.memberId,
    };
    await this.valkey.setJson(cacheKey, result, MEMBERSHIP_CACHE_TTL);

    return result;
  }

  private async resolveAdminMfa(sub: string, email: string, poolId: string): Promise<boolean> {
    const cacheKey = `mfa:${sub}`;

    const cached = await this.valkey.getJson<{ hasMfa: boolean }>(cacheKey);
    if (cached) return cached.hasMfa;

    const hasMfa = await this.cognito.adminCheckMfaEnabled(email, poolId);
    await this.valkey.setJson(cacheKey, { hasMfa }, MFA_CACHE_TTL);

    return hasMfa;
  }

  private async assertNotRevoked(
    payload: CognitoJwtPayload,
    surfaceKey: string | null,
  ): Promise<void> {
    const userPoolId = this.extractUserPoolId(payload.iss);
    const revokeBefore = await this.repository.findSubjectRevocation(payload.sub, userPoolId);

    if (revokeBefore) {
      const authTime = payload.auth_time ? new Date(payload.auth_time * 1000) : null;
      if (!authTime || authTime <= revokeBefore) {
        throw new UnauthorizedException('Session revoked');
      }
    }

    if (surfaceKey && payload.origin_jti) {
      const isRevoked = await this.repository.hasLineageRevocation({
        cognitoSub: payload.sub,
        userPoolId,
        originJti: payload.origin_jti,
        surfaceKey,
      });

      if (isRevoked) {
        throw new UnauthorizedException('Session revoked');
      }
    }
  }

  private extractUserPoolId(issuer: string): string {
    const poolId = issuer.split('/').pop();

    if (!poolId) {
      throw new UnauthorizedException('Unknown token issuer');
    }

    return poolId;
  }
}
