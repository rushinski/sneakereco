import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import JwksClient from 'jwks-rsa';
import { tenantCognitoConfig, users, tenantMembers } from '@sneakereco/db';

import { DatabaseService } from '../../common/database/database.service';
import type { CognitoJwtPayload, AuthenticatedUser } from './auth.types';
import type { TenantMemberRole } from '@sneakereco/db';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly platformIssuer: string;
  private readonly platformAdminClientId: string;
  private readonly platformJwksClient: JwksClient.JwksClient;
  private readonly tenantJwksClients = new Map<string, JwksClient.JwksClient>();
  // poolId → {customerClientId, adminClientId}
  private readonly tenantClientIdCache = new Map<string, { customer: string; admin: string }>();
  // sub → tenant membership — TTL matches access token lifetime (60 min)
  private readonly membershipCache = new Map<string, {
    tenantId: string;
    role: TenantMemberRole;
    memberId: string;
    expiresAt: number;
  }>();

  constructor(
    private readonly db: DatabaseService,
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
          // Decode JWT without verification to extract iss + kid
          const [headerB64, payloadB64] = rawJwtToken.split('.');
          const header = JSON.parse(Buffer.from(headerB64 ?? '', 'base64url').toString()) as Record<string, string>;
          const payload = JSON.parse(Buffer.from(payloadB64 ?? '', 'base64url').toString()) as Record<string, string>;
          const iss = payload['iss'];
          const kid = header['kid'];

          if (!iss || !kid) {
            return done(new UnauthorizedException('Malformed token'));
          }

          const publicKey = await this.resolveSigningKey(iss, kid);
          done(null, publicKey);
        } catch (err) {
          done(err instanceof Error ? err : new Error(String(err)));
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

  private async resolveSigningKey(iss: string, kid: string): Promise<string> {
    // Platform pool — implicit super admin
    if (iss === this.platformIssuer) {
      const key = await this.platformJwksClient.getSigningKey(kid);
      return key.getPublicKey();
    }

    // Tenant pool — extract pool ID from issuer URL and verify it's known
    const poolId = iss.split('/').pop();
    if (!poolId) throw new UnauthorizedException('Unknown token issuer');

    const [config] = await this.db.systemDb
      .select({
        userPoolId: tenantCognitoConfig.userPoolId,
        customerClientId: tenantCognitoConfig.customerClientId,
        adminClientId: tenantCognitoConfig.adminClientId,
      })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.userPoolId, poolId))
      .limit(1);

    if (!config) throw new UnauthorizedException('Unknown token issuer');

    // Cache client IDs so validate() can check audience without a second DB hit
    this.tenantClientIdCache.set(poolId, {
      customer: config.customerClientId,
      admin: config.adminClientId,
    });

    if (!this.tenantJwksClients.has(poolId)) {
      this.tenantJwksClients.set(
        poolId,
        JwksClient({
          jwksUri: `${iss}/.well-known/jwks.json`,
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
        }),
      );
    }

    const client = this.tenantJwksClients.get(poolId)!;
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  }

  async validate(payload: CognitoJwtPayload): Promise<AuthenticatedUser> {
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isPlatform = payload.iss === this.platformIssuer;

    if (isPlatform) {
      if (payload.client_id !== this.platformAdminClientId) {
        throw new UnauthorizedException('Invalid token audience');
      }
      return {
        cognitoId: payload.sub,
        email: payload.email,
        isSuperAdmin: true,
        tenantId: undefined,
        role: 'admin',
        memberId: undefined,
      };
    }

    // Validate audience for tenant tokens
    const poolId = payload.iss.split('/').pop();
    const cached = poolId ? this.tenantClientIdCache.get(poolId) : undefined;
    if (cached && payload.client_id !== cached.customer && payload.client_id !== cached.admin) {
      throw new UnauthorizedException('Invalid token audience');
    }

    // Resolve tenant membership from DB.
    // Cache result for the lifetime of the access token (60 min) to avoid
    // a DB hit on every request while still reflecting role changes promptly
    // after the next token refresh.
    const membership = await this.resolveMembership(payload.sub);
    if (!membership) {
      throw new UnauthorizedException('User has no tenant membership');
    }

    return {
      cognitoId: payload.sub,
      email: payload.email,
      isSuperAdmin: false,
      tenantId: membership.tenantId,
      role: membership.role,
      memberId: membership.memberId,
    };
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

    const [row] = await this.db.systemDb
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        memberId: tenantMembers.id,
      })
      .from(users)
      .innerJoin(tenantMembers, eq(tenantMembers.userId, users.id))
      .where(eq(users.cognitoSub, sub))
      .limit(1);

    if (!row) return null;

    const entry = {
      tenantId: row.tenantId,
      role: row.role as TenantMemberRole,
      memberId: row.memberId,
      expiresAt: Date.now() + 60 * 60 * 1000, // 60 minutes — matches access token TTL
    };
    this.membershipCache.set(sub, entry);

    return entry;
  }
}
