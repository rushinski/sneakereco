import { Injectable, UnauthorizedException } from '@nestjs/common';

import type { AuthPrincipal } from './auth.types';

type ClaimValue = string | string[] | undefined;
type Claims = Record<string, ClaimValue>;

@Injectable()
export class AuthPrincipalNormalizerService {
  normalize(claims: Claims): AuthPrincipal {
    const groups = this.asArray(claims['cognito:groups']);
    const adminTypeClaim = this.asString(claims['custom:admin_type']);
    const tenantId = this.asString(claims['custom:tenant_id']);
    const sessionId = this.asString(claims['custom:session_id']);
    const sessionVersion = this.asString(claims['custom:session_version']);
    const cognitoSub = this.asString(claims.sub);
    const userPoolId = this.asString(claims.iss);
    const appClientId = this.asString(claims.client_id);
    const issuedAt = this.asString(claims.iat) ?? new Date().toISOString();

    if (!cognitoSub || !userPoolId || !appClientId || !sessionId || !sessionVersion) {
      throw new UnauthorizedException('Missing required auth claims');
    }

    if (adminTypeClaim === 'platform_admin') {
      return {
        actorType: 'platform_admin',
        cognitoSub,
        userPoolId,
        appClientId,
        sessionId,
        sessionVersion,
        issuedAt,
        groups,
        adminType: 'platform_admin',
      };
    }

    if (adminTypeClaim === 'tenant_admin') {
      if (!tenantId) {
        throw new UnauthorizedException('Missing tenant admin tenant claim');
      }

      return {
        actorType: 'tenant_admin',
        cognitoSub,
        userPoolId,
        appClientId,
        sessionId,
        sessionVersion,
        issuedAt,
        groups,
        adminType: 'tenant_admin',
        tenantId,
      };
    }

    return {
      actorType: 'customer',
      cognitoSub,
      userPoolId,
      appClientId,
      sessionId,
      sessionVersion,
      issuedAt,
      groups,
      tenantId,
    };
  }

  private asArray(value: ClaimValue) {
    if (Array.isArray(value)) {
      return value.map(String);
    }

    if (typeof value === 'string' && value.length > 0) {
      return [value];
    }

    return [];
  }

  private asString(value: ClaimValue) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}