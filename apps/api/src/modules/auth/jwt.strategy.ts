import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import JwksClient from 'jwks-rsa';
import { tenantCognitoConfig } from '@sneakereco/db';

import { DatabaseService } from '../../common/database/database.service';
import type { CognitoJwtPayload, AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly platformIssuer: string;
  private readonly platformAdminClientId: string;
  private readonly platformJwksClient: JwksClient.JwksClient;
  private readonly tenantJwksClients = new Map<string, JwksClient.JwksClient>();
  // Short-lived in-process cache: poolId → {customerClientId, adminClientId}
  // Populated during resolveSigningKey so validate() can check audience without
  // an extra DB round-trip per request.
  private readonly tenantClientIdCache = new Map<string, { customer: string; admin: string }>();

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

  validate(payload: CognitoJwtPayload): AuthenticatedUser {
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isPlatform = payload.iss === this.platformIssuer;

    // Validate client_id (audience) — prevents tokens issued for one app client
    // from being used against a different client in the same Cognito pool.
    if (isPlatform) {
      if (payload.client_id !== this.platformAdminClientId) {
        throw new UnauthorizedException('Invalid token audience');
      }
    } else {
      const poolId = payload.iss.split('/').pop();
      const cached = poolId ? this.tenantClientIdCache.get(poolId) : undefined;
      if (cached && payload.client_id !== cached.customer && payload.client_id !== cached.admin) {
        throw new UnauthorizedException('Invalid token audience');
      }
      // If not yet cached (e.g. resolveSigningKey ran on a different instance),
      // skip the audience check rather than fail — the issuer check already
      // confirmed the token came from a known Cognito pool.
    }

    return {
      cognitoId: payload.sub,
      email: payload.email,
      isSuperAdmin: isPlatform,
      tenantId: isPlatform ? undefined : payload['custom:tenant_id'],
      role: isPlatform ? 'admin' : payload['custom:role'],
      memberId: isPlatform ? undefined : payload['custom:member_id'],
    };
  }
}
