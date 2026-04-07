/* eslint-disable @typescript-eslint/consistent-type-imports */
import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray } from 'drizzle-orm';
import {
  tenantDomainConfig,
  tenantMembers,
  tenantOnboarding,
  tenants,
  users,
} from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import type { DrizzleTransaction } from '../../common/database/database.service';
import { DatabaseService } from '../../common/database/database.service';
import { CognitoService } from '../auth/cognito.service';
import { CommunicationsService } from '../communications/communications.service';

import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import type { RequestOnboardingDto } from './dto/request-onboarding.dto';
import {
  buildAdminDomain,
  buildCandidateSlug,
  buildInstagramUrl,
  buildProvisionalSlug,
  createInviteToken,
  hashInviteToken,
  isInviteExpired,
  normalizeInstagramHandle,
} from './onboarding.utils';

interface InviteRecord {
  tenantId: string;
  requestedByEmail: string | null;
  requestedByName: string | null;
  businessName: string | null;
  inviteSentAt: Date | null;
  inviteAcceptedAt: Date | null;
  requestStatus: 'pending' | 'approved' | 'rejected' | 'invited';
  subdomain: string | null;
  adminDomain: string | null;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cognito: CognitoService,
    private readonly communications: CommunicationsService,
    private readonly config: ConfigService,
  ) {}

  async requestAccount(dto: RequestOnboardingDto) {
    const email = dto.email.trim().toLowerCase();
    const normalizedHandle = normalizeInstagramHandle(dto.instagramHandle);

    const requestResult = await this.db.withSystemContext(async (tx) => {
      const [existing] = await tx
        .select({ id: tenantOnboarding.id })
        .from(tenantOnboarding)
        .where(
          and(
            eq(tenantOnboarding.requestedByEmail, email),
            inArray(tenantOnboarding.requestStatus, ['pending', 'invited']),
          ),
        )
        .limit(1);

      if (existing) {
        return { duplicate: true as const };
      }

      const tenantId = generateId('tenant');
      const onboardingId = generateId('tenantOnboarding');

      await tx.insert(tenants).values({
        id: tenantId,
        name: dto.businessName.trim(),
        slug: buildProvisionalSlug(tenantId),
        email,
        phone: dto.phoneNumber.trim(),
        instagram: normalizedHandle,
        businessName: dto.businessName.trim(),
        status: 'inactive',
      });

      await tx.insert(tenantOnboarding).values({
        id: onboardingId,
        tenantId,
        requestStatus: 'pending',
        requestedByEmail: email,
        requestedByName: dto.fullName.trim(),
        requestedByPhone: dto.phoneNumber.trim(),
        businessName: dto.businessName.trim(),
        instagramUrl: buildInstagramUrl(normalizedHandle),
      });

      return { duplicate: false as const };
    });

    if (!requestResult.duplicate) {
      await this.communications.sendPlatformRequestNotification({
        businessName: dto.businessName.trim(),
        email,
        fullName: dto.fullName.trim(),
        instagramHandle: normalizedHandle,
        phoneNumber: dto.phoneNumber.trim(),
      });
    }

    return { submitted: true };
  }

  async approveRequest(tenantId: string) {
    const inviteToken = createInviteToken();
    const inviteTokenHash = hashInviteToken(inviteToken);
    const inviteLink = `${this.getPlatformBaseUrl()}/invite/${inviteToken}`;

    const approval = await this.db.withSystemContext(async (tx) => {
      const [record] = await tx
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

      if (!record) {
        throw new NotFoundException('Onboarding request not found');
      }

      const subdomain = await this.resolveUniqueSubdomain(
        record.businessName ?? record.tenantName,
        tx,
      );
      const adminDomain = buildAdminDomain(subdomain);
      const now = new Date();

      await tx
        .update(tenants)
        .set({
          slug: subdomain,
          updatedAt: now,
        })
        .where(eq(tenants.id, tenantId));

      await tx
        .insert(tenantDomainConfig)
        .values({
          id: generateId('tenantDomainConfig'),
          tenantId,
          subdomain,
          adminDomain,
        })
        .onConflictDoUpdate({
          target: tenantDomainConfig.tenantId,
          set: {
            adminDomain,
            subdomain,
            updatedAt: now,
          },
        });

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

      return {
        adminDomain,
        businessName: record.businessName ?? record.tenantName,
        email: record.requestedByEmail,
        fullName: record.requestedByName,
        subdomain,
      };
    });

    if (!approval.email) {
      throw new InternalServerErrorException('Onboarding request is missing the applicant email');
    }

    await this.communications.sendOnboardingInvite({
      adminDomain: approval.adminDomain,
      businessName: approval.businessName,
      email: approval.email,
      fullName: approval.fullName,
      inviteLink,
    });

    return {
      adminDomain: approval.adminDomain,
      inviteLink,
      subdomain: approval.subdomain,
    };
  }

  async denyRequest(tenantId: string) {
    const denial = await this.db.withSystemContext(async (tx) => {
      const [record] = await tx
        .select({
          businessName: tenantOnboarding.businessName,
          email: tenantOnboarding.requestedByEmail,
          fullName: tenantOnboarding.requestedByName,
        })
        .from(tenantOnboarding)
        .where(eq(tenantOnboarding.tenantId, tenantId))
        .limit(1);

      if (!record) {
        throw new NotFoundException('Onboarding request not found');
      }

      await tx
        .update(tenantOnboarding)
        .set({
          requestStatus: 'rejected',
          updatedAt: new Date(),
        })
        .where(eq(tenantOnboarding.tenantId, tenantId));

      return record;
    });

    if (denial.email) {
      await this.communications.sendOnboardingDenial({
        businessName: denial.businessName,
        email: denial.email,
        fullName: denial.fullName,
      });
    }

    return { denied: true };
  }

  async validateInvite(token: string) {
    const record = await this.getInviteRecord(token);

    return {
      businessName: record.businessName,
      email: record.requestedByEmail,
      fullName: record.requestedByName,
      tenantId: record.tenantId,
    };
  }

  async completeOnboarding(dto: CompleteOnboardingDto) {
    const inviteRecord = await this.getInviteRecord(dto.token);

    const email = inviteRecord.requestedByEmail;
    if (!email) {
      throw new InternalServerErrorException('Onboarding request is missing the applicant email');
    }

    const cognitoSub = await this.cognito.createAdminUser({
      email,
      fullName: inviteRecord.requestedByName,
      password: dto.password,
    });

    await this.db.withSystemContext(async (tx) => {
      const [existingUserBySub] = await tx
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.cognitoSub, cognitoSub))
        .limit(1);

      if (existingUserBySub) {
        await this.attachOwnerMembership(tx, inviteRecord.tenantId, existingUserBySub.id);
        await this.markInviteAccepted(tx, inviteRecord.tenantId);
        return;
      }

      const [existingUserByEmail] = await tx
        .select({
          id: users.id,
          cognitoSub: users.cognitoSub,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUserByEmail?.cognitoSub && existingUserByEmail.cognitoSub !== cognitoSub) {
        throw new ConflictException('An account with this email already exists');
      }

      const userId = existingUserByEmail?.id ?? generateId('user');
      const now = new Date();

      if (existingUserByEmail) {
        await tx
          .update(users)
          .set({
            cognitoSub,
            email,
            fullName: inviteRecord.requestedByName,
            updatedAt: now,
          })
          .where(eq(users.id, existingUserByEmail.id));
      } else {
        await tx.insert(users).values({
          id: userId,
          email,
          fullName: inviteRecord.requestedByName,
          cognitoSub,
        });
      }

      await this.attachOwnerMembership(tx, inviteRecord.tenantId, userId);
      await this.markInviteAccepted(tx, inviteRecord.tenantId);
    });

    const authResult = await this.cognito.signIn({
      clientType: 'admin',
      email,
      password: dto.password,
    });

    if (authResult.type !== 'tokens') {
      throw new InternalServerErrorException('Unexpected MFA challenge during onboarding sign-in');
    }

    const { secretCode } = await this.cognito.associateSoftwareToken(authResult.accessToken);

    if (!inviteRecord.adminDomain) {
      throw new InternalServerErrorException('Tenant admin domain is not configured');
    }

    return {
      accessToken: authResult.accessToken,
      adminRedirectUrl: `https://${inviteRecord.adminDomain}/dashboard`,
      expiresIn: authResult.expiresIn,
      idToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      secretCode,
    };
  }

  private async getInviteRecord(token: string): Promise<InviteRecord> {
    const inviteTokenHash = hashInviteToken(token);

    const [record] = await this.db.systemDb
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
      .where(eq(tenantOnboarding.inviteTokenHash, inviteTokenHash))
      .limit(1);

    if (!record) {
      throw new NotFoundException('Invite not found');
    }

    if (record.inviteAcceptedAt) {
      throw new GoneException('Invite has already been used');
    }

    if (record.requestStatus !== 'invited' || isInviteExpired(record.inviteSentAt)) {
      throw new GoneException('Invite has expired');
    }

    return record;
  }

  private async attachOwnerMembership(tx: DrizzleTransaction, tenantId: string, userId: string) {
    await tx
      .insert(tenantMembers)
      .values({
        id: generateId('tenantMember'),
        tenantId,
        userId,
        role: 'admin',
        isOwner: true,
      })
      .onConflictDoNothing({
        target: [tenantMembers.tenantId, tenantMembers.userId],
      });
  }

  private async markInviteAccepted(tx: DrizzleTransaction, tenantId: string) {
    await tx
      .update(tenantOnboarding)
      .set({
        inviteAcceptedAt: new Date(),
        requestStatus: 'approved',
        updatedAt: new Date(),
      })
      .where(eq(tenantOnboarding.tenantId, tenantId));
  }

  private async resolveUniqueSubdomain(source: string, tx: DrizzleTransaction): Promise<string> {
    const baseSlug = buildCandidateSlug(source);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;

      const [existingTenant] = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, candidate))
        .limit(1);
      const [existingDomain] = await tx
        .select({ id: tenantDomainConfig.id })
        .from(tenantDomainConfig)
        .where(eq(tenantDomainConfig.subdomain, candidate))
        .limit(1);

      if (!existingTenant && !existingDomain) {
        return candidate;
      }
    }

    throw new InternalServerErrorException('Unable to allocate a unique tenant subdomain');
  }

  private getPlatformBaseUrl(): string {
    return (this.config.get<string>('PLATFORM_URL') ?? 'https://sneakereco.com').replace(/\/$/, '');
  }
}
