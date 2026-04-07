import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { CognitoJwtPayload, AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const region = config.getOrThrow<string>('AWS_REGION');
    const userPoolId = config.getOrThrow<string>('COGNITO_USER_POOL_ID');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    });
  }

  validate(payload: CognitoJwtPayload): AuthenticatedUser {
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      cognitoId: payload.sub,
      email: payload.email,
      tenantId: payload['custom:tenant_id'],
      role: payload['custom:role'],
      memberId: payload['custom:member_id'],
    };
  }
}
