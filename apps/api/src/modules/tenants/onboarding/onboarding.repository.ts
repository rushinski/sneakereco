import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  tenantCognitoConfig,
  tenantDomainConfig,
  tenantMembers,
  tenantOnboarding,
  tenants,
  users,
} from '@sneakereco/db';
import type {
  NewTenant,
  NewTenantDomainConfig,
  NewTenantMember,
  NewTenantOnboarding,
  NewUser,
  TenantOnboarding,
} from '@sneakereco/shared';

import type { DrizzleTransaction } from '../../../core/database/database.service';
import { DatabaseService } from '../../../core/database/database.service';

export interface InviteRecord {
  tenantId: string;
  requestedByEmail: string | null;
  requestedByName: string | null;
  businessName: string | null;
  inviteSentAt: Date | null;
  inviteAcceptedAt: Date | null;
  requestStatus: TenantOnboarding['requestStatus'];
  subdomain: string | null;
  adminDomain: string | null;
}

@Injectable()
export class OnboardingRepository {
  constructor(private readonly db: DatabaseService) {}

  async findPendingOrInvitedByEmail(email: string): Promise<{ id: string } | undefined> {
    const [row] = await this.db.systemDb
      .select({ id: tenantOnboarding.id })
      .from(tenantOnboarding)
      .where(
        and(
          eq(tenantOnboarding.requestedByEmail, email),
          inArray(tenantOnboarding.requestStatus, ['pending', 'invited']),
        ),
      )
      .limit(1);
    return row;
  }

  async findByInviteTokenHash(tokenHash: string): Promise<InviteRecord | undefined> {
    const [row] = await this.db.systemDb
      .select({
        adminDomain: tenantDomainConfig.adminDomain,
        businessName: tenantOnboarding.businessName,
        inviteAcceptedAt: tenantOnboarding.inviteAcceptedAt,
        inviteSentAt: tenantOnboarding.inviteSentAt,
        requestStatus: tenantOnboarding.requestStatus,
        requestedByEmail: tenantOnboarding.requestedByEmail,
        requestedByName: tenantOnboarding.requestedByName,
        subdomain: tenantDomainConfig.subdomain,
        tenantId: tenantOnboarding.tenantId,
      })
      .from(tenantOnboarding)
      .leftJoin(tenantDomainConfig, eq(tenantDomainConfig.tenantId, tenantOnboarding.tenantId))
      .where(eq(tenantOnboarding.inviteTokenHash, tokenHash))
      .limit(1);
    return row;
  }

  async findRequestDetails(tenantId: string): Promise<
    | {
        requestedByEmail: string | null;
        requestedByName: string | null;
        businessName: string | null;
        tenantName: string;
      }
    | undefined
  > {
    const [row] = await this.db.systemDb
      .select({
        requestedByEmail: tenantOnboarding.requestedByEmail,
        requestedByName: tenantOnboarding.requestedByName,
        businessName: tenantOnboarding.businessName,
        tenantName: tenants.name,
      })
      .from(tenantOnboarding)
      .innerJoin(tenants, eq(tenants.id, tenantOnboarding.tenantId))
      .where(eq(tenantOnboarding.tenantId, tenantId))
      .limit(1);
    return row;
  }

  async findDenialDetails(tenantId: string): Promise<
    | {
        businessName: string | null;
        email: string | null;
        fullName: string | null;
      }
    | undefined
  > {
    const [row] = await this.db.systemDb
      .select({
        businessName: tenantOnboarding.businessName,
        email: tenantOnboarding.requestedByEmail,
        fullName: tenantOnboarding.requestedByName,
      })
      .from(tenantOnboarding)
      .where(eq(tenantOnboarding.tenantId, tenantId))
      .limit(1);
    return row;
  }

  async findTenantCognitoConfig(
    tenantId: string,
  ): Promise<{ userPoolId: string; customerClientId: string } | undefined> {
    const [row] = await this.db.systemDb
      .select({
        userPoolId: tenantCognitoConfig.userPoolId,
        customerClientId: tenantCognitoConfig.customerClientId,
      })
      .from(tenantCognitoConfig)
      .where(eq(tenantCognitoConfig.tenantId, tenantId))
      .limit(1);
    return row;
  }

  async isTenantSlugTaken(slug: string, tx: DrizzleTransaction): Promise<boolean> {
    const [row] = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return Boolean(row);
  }

  async isDomainSubdomainTaken(subdomain: string, tx: DrizzleTransaction): Promise<boolean> {
    const [row] = await tx
      .select({ id: tenantDomainConfig.id })
      .from(tenantDomainConfig)
      .where(eq(tenantDomainConfig.subdomain, subdomain))
      .limit(1);
    return Boolean(row);
  }

  async findUserByCognitoSub(
    cognitoSub: string,
    tx: DrizzleTransaction,
  ): Promise<{ id: string } | undefined> {
    const [row] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub))
      .limit(1);
    return row;
  }

  async findUserByEmail(
    email: string,
    tx: DrizzleTransaction,
  ): Promise<{ id: string; cognitoSub: string | null } | undefined> {
    const [row] = await tx
      .select({ id: users.id, cognitoSub: users.cognitoSub })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row;
  }

  // --- Writes (all require a transaction) ---

  async insertTenant(tenant: NewTenant, tx: DrizzleTransaction): Promise<void> {
    await tx.insert(tenants).values(tenant);
  }

  async insertOnboarding(onboarding: NewTenantOnboarding, tx: DrizzleTransaction): Promise<void> {
    await tx.insert(tenantOnboarding).values(onboarding);
  }

  async upsertDomainConfig(config: NewTenantDomainConfig, tx: DrizzleTransaction): Promise<void> {
    await tx
      .insert(tenantDomainConfig)
      .values(config)
      .onConflictDoUpdate({
        target: tenantDomainConfig.tenantId,
        set: {
          adminDomain: config.adminDomain,
          subdomain: config.subdomain,
          updatedAt: new Date(),
        },
      });
  }

  async insertTenantCognitoConfig(
    config: {
      id: string;
      tenantId: string;
      userPoolId: string;
      userPoolArn: string;
      customerClientId: string;
      region: string;
    },
    tx: DrizzleTransaction,
  ): Promise<void> {
    await tx.insert(tenantCognitoConfig).values(config);
  }

  async updateTenantSlug(tenantId: string, slug: string, tx: DrizzleTransaction): Promise<void> {
    await tx.update(tenants).set({ slug, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  }

  async markInviteSent(
    tenantId: string,
    inviteTokenHash: string,
    tx: DrizzleTransaction,
  ): Promise<void> {
    const now = new Date();
    await tx
      .update(tenantOnboarding)
      .set({
        requestStatus: 'invited',
        inviteAcceptedAt: null,
        inviteSentAt: now,
        inviteTokenHash,
        updatedAt: now,
      })
      .where(eq(tenantOnboarding.tenantId, tenantId));
  }

  async markInviteAccepted(tenantId: string, tx: DrizzleTransaction): Promise<void> {
    const now = new Date();
    await tx
      .update(tenantOnboarding)
      .set({ inviteAcceptedAt: now, requestStatus: 'approved', updatedAt: now })
      .where(eq(tenantOnboarding.tenantId, tenantId));
  }

  async markRejected(tenantId: string, tx: DrizzleTransaction): Promise<void> {
    await tx
      .update(tenantOnboarding)
      .set({ requestStatus: 'rejected', updatedAt: new Date() })
      .where(eq(tenantOnboarding.tenantId, tenantId));
  }

  async insertUser(user: NewUser, tx: DrizzleTransaction): Promise<void> {
    await tx.insert(users).values(user);
  }

  async updateUserCognitoSub(
    userId: string,
    cognitoSub: string,
    email: string,
    fullName: string | null,
    tx: DrizzleTransaction,
  ): Promise<void> {
    await tx
      .update(users)
      .set({ cognitoSub, email, fullName, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async insertTenantMember(member: NewTenantMember, tx: DrizzleTransaction): Promise<void> {
    await tx
      .insert(tenantMembers)
      .values(member)
      .onConflictDoNothing({
        target: [tenantMembers.tenantId, tenantMembers.userId],
      });
  }
}
