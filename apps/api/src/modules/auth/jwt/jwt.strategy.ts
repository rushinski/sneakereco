import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import JwksClient from 'jwks-rsa';
import type { TenantMemberRole } from '@sneakereco/db';

import { CognitoService } from '../cognito/cognito.service';
import type { AuthenticatedUser, CognitoJwtPayload } from '../auth.types';
import { JwtStrategyRepository } from './jwt-strategy.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly platformIssuer: string;
  private readonly platformAdminClientId: string;
  private readonly platformJwksClient: JwksClient.JwksClient;
  private readonly tenantJwksClients = new Map<string, JwksClient.JwksClient>();
  private readonly tenantClientIdCache = new Map<string, { customer: string; admin: string }>();
  private readonly membershipCache = new Map<string, {
    tenantId: string;
    role: TenantMemberRole;
    memberId: string;
    expiresAt: number;
  }>();
  private readonly mfaCache = new Map<string, { hasMfa: boolean; expiresAt: number }>();

  constructor(
    private readonly repository: JwtStrategyRepository,
    private readonly cognito: CognitoService,
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
    this.platformAdminClientId = config.getOrThrow<string>('PLATFORM_COGNITO_ADMIN_CLIENT_ID');
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

    if (payload.iss === this.platformIssuer) {
      if (payload.client_id !== this.platformAdminClientId) {
        throw new UnauthorizedException('Invalid token audience');
      }

      return {
        cognitoSub: payload.sub,
        email: payload.email,
        isSuperAdmin: true,
        tenantId: undefined,
        role: undefined,
        memberId: undefined,
      };
    }

    const poolId = payload.iss.split('/').pop();
    if (!poolId) {
      throw new UnauthorizedException('Unknown token issuer');
    }

    const clientIds = await this.resolveTenantClientIds(poolId);

    if (payload.client_id !== clientIds.customer && payload.client_id !== clientIds.admin) {
      throw new UnauthorizedException('Invalid token audience');
    }

    if (payload.client_id === clientIds.admin) {
      const hasMfa = await this.resolveAdminMfa(payload.sub, payload.email, poolId);
      if (!hasMfa) {
        throw new ForbiddenException(
          'MFA is required for admin accounts. Complete MFA setup before accessing the admin panel.',
        );
      }
    }

    const membership = await this.resolveMembership(payload.sub);
    if (!membership) {
      throw new UnauthorizedException('User has no tenant membership');
    }

    return {
      cognitoSub: payload.sub,
      email: payload.email,
      isSuperAdmin: false,
      tenantId: membership.tenantId,
      role: membership.role,
      memberId: membership.memberId,
    };
  }

  evictMembershipCache(sub: string): void {
    this.membershipCache.delete(sub);
    this.mfaCache.delete(sub);
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

    await this.resolveTenantClientIds(poolId);

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

  private async resolveTenantClientIds(poolId: string): Promise<{ customer: string; admin: string }> {
    const cached = this.tenantClientIdCache.get(poolId);
    if (cached) {
      return cached;
    }

    const config = await this.repository.findPoolByPoolId(poolId);
    if (!config) {
      throw new UnauthorizedException('Unknown token issuer');
    }

    const clientIds = {
      customer: config.customerClientId,
      admin: config.adminClientId,
    };
    this.tenantClientIdCache.set(poolId, clientIds);

    return clientIds;
  }

  private async resolveMembership(sub: string): Promise<{
    tenantId: string;
    role: TenantMemberRole;
    memberId: string;
  } | null> {
    const cached = this.membershipCache.get(sub);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const membership = await this.repository.findMembershipByCognitoSub(sub);
    if (!membership) {
      return null;
    }

    this.membershipCache.set(sub, {
      ...membership,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return membership;
  }

  private async resolveAdminMfa(sub: string, email: string, poolId: string): Promise<boolean> {
    const cached = this.mfaCache.get(sub);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.hasMfa;
    }

    const hasMfa = await this.cognito.adminCheckMfaEnabled(email, poolId);
    this.mfaCache.set(sub, { hasMfa, expiresAt: Date.now() + 60 * 60 * 1000 });
    return hasMfa;
  }
}
