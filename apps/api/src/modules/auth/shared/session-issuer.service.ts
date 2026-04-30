import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { AdminUsersRepository } from './admin-users.repository';
import { AuthSessionRepository } from './auth-session.repository';
import type { CompletedAuthChallenge } from './auth.types';
import { CustomerUsersRepository } from './customer-users.repository';

@Injectable()
export class SessionIssuerService {
  constructor(
    private readonly adminUsersRepository: AdminUsersRepository,
    private readonly customerUsersRepository: CustomerUsersRepository,
    private readonly authSessionRepository: AuthSessionRepository,
  ) {}

  async issue(challenge: CompletedAuthChallenge, context: {
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + (challenge.actorType === 'customer' ? 60 : 30) * 60_000,
    ).toISOString();

    if (challenge.actorType === 'customer') {
      const customerUser = challenge.tenantId
        ? await this.customerUsersRepository.findByTenantAndCognitoSub(
            challenge.tenantId,
            challenge.cognitoSub,
          )
        : null;

      if (!customerUser) {
        throw new UnauthorizedException('Customer user is not provisioned locally');
      }

      await this.customerUsersRepository.touchLastLogin(customerUser.id);
      const session = await this.authSessionRepository.create({
        actorType: challenge.actorType,
        customerUserId: customerUser.id,
        tenantId: challenge.tenantId,
        userPoolId: challenge.userPoolId,
        appClientId: challenge.appClientId,
        cognitoSub: challenge.cognitoSub,
        deviceId: context.deviceId,
        sessionVersion: '1',
        refreshTokenFingerprint: this.fingerprint(challenge.refreshToken ?? challenge.accessToken),
        originJti: challenge.originJti,
        status: 'active',
        issuedAt,
        expiresAt,
        lastSeenAt: issuedAt,
        lastRefreshAt: issuedAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        accessToken: challenge.accessToken,
        refreshToken: challenge.refreshToken,
        principal: {
          actorType: challenge.actorType,
          cognitoSub: challenge.cognitoSub,
          userPoolId: challenge.userPoolId,
          appClientId: challenge.appClientId,
          sessionId: session.id,
          sessionVersion: session.sessionVersion,
          issuedAt,
          groups: challenge.groups,
          tenantId: challenge.tenantId,
        },
      };
    }

    const adminUser = await this.adminUsersRepository.findByCognitoSub(challenge.cognitoSub);
    if (!adminUser) {
      throw new UnauthorizedException('Admin user is not provisioned locally');
    }

    await this.adminUsersRepository.markActive(adminUser.id);
    const session = await this.authSessionRepository.create({
      actorType: challenge.actorType,
      adminUserId: adminUser.id,
      tenantId: challenge.tenantId,
      userPoolId: challenge.userPoolId,
      appClientId: challenge.appClientId,
      cognitoSub: challenge.cognitoSub,
      deviceId: context.deviceId,
      sessionVersion: '1',
      refreshTokenFingerprint: this.fingerprint(challenge.refreshToken ?? challenge.accessToken),
      originJti: challenge.originJti,
      status: 'active',
      issuedAt,
      expiresAt,
      lastSeenAt: issuedAt,
      lastRefreshAt: issuedAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      accessToken: challenge.accessToken,
      refreshToken: challenge.refreshToken,
      principal: {
        actorType: challenge.actorType,
        cognitoSub: challenge.cognitoSub,
        userPoolId: challenge.userPoolId,
        appClientId: challenge.appClientId,
        sessionId: session.id,
        sessionVersion: session.sessionVersion,
        issuedAt,
        groups: challenge.groups,
        adminType: challenge.actorType === 'platform_admin' ? 'platform_admin' : 'tenant_admin',
        tenantId: challenge.tenantId,
      },
    };
  }

  private fingerprint(input: string) {
    return createHash('sha256').update(input).digest('hex');
  }
}