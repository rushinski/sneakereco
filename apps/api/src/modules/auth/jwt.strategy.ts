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
  private readonly platformJwksClient: JwksClient.JwksClient;
  private readonly tenantJwksClients = new Map<string, JwksClient.JwksClient>();

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
      .select({ userPoolId: tenantCognitoConfig.userPoolId })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.userPoolId, poolId))
      .limit(1);

    if (!config) throw new UnauthorizedException('Unknown token issuer');

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
