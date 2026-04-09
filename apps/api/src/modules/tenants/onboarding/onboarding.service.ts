import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateId } from '@sneakereco/shared';

import type { DrizzleTransaction } from '../../../common/database/database.service';
import { DatabaseService } from '../../../common/database/database.service';
import { CognitoService } from '../../auth/cognito.service';
import { EmailService } from '../../communications/email/email.service';

import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import type { RequestOnboardingDto } from './dto/request-onboarding.dto';
import { OnboardingRepository } from './onboarding.repository';
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

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly onboardingRepository: OnboardingRepository,
    private readonly cognito: CognitoService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async requestAccount(dto: RequestOnboardingDto) {
    const email = dto.email.trim().toLowerCase();
    const normalizedHandle = normalizeInstagramHandle(dto.instagramHandle);

    const requestResult = await this.db.withSystemContext(async (tx) => {
      const existing = await this.onboardingRepository.findPendingOrInvitedByEmail(email);

      if (existing) {
        this.logger.log(`Skipping admin notification for duplicate onboarding request email=${email}`);
        return { duplicate: true as const };
      }

      const tenantId = generateId('tenant');
      const onboardingId = generateId('tenantOnboarding');

      await this.onboardingRepository.insertTenant(
        {
          id: tenantId,
          name: dto.businessName.trim(),
          slug: buildProvisionalSlug(tenantId),
          email,
          phone: dto.phoneNumber.trim(),
          instagram: normalizedHandle,
          businessName: dto.businessName.trim(),
          status: 'inactive',
        },
        tx,
      );

      await this.onboardingRepository.insertOnboarding(
        {
          id: onboardingId,
          tenantId,
          requestStatus: 'pending',
          requestedByEmail: email,
          requestedByName: dto.fullName.trim(),
          requestedByPhone: dto.phoneNumber.trim(),
          businessName: dto.businessName.trim(),
          instagramUrl: buildInstagramUrl(normalizedHandle),
        },
        tx,
      );

      return { duplicate: false as const };
    });

    if (!requestResult.duplicate) {
      this.logger.log(`Created onboarding request and sending admin notification email=${email}`);
      try {
        await this.email.sendPlatformRequestNotification({
          businessName: dto.businessName.trim(),
          email,
          fullName: dto.fullName.trim(),
          instagramHandle: normalizedHandle,
          phoneNumber: dto.phoneNumber.trim(),
        });
      } catch (error) {
        this.logger.error(
          `Admin notification email failed for onboarding request email=${email}`,
          error instanceof Error ? error.stack : undefined,
        );
      }

      try {
        await this.email.sendRequestConfirmation({
          businessName: dto.businessName.trim(),
          email,
          fullName: dto.fullName.trim(),
        });
      } catch (error) {
        this.logger.error(
          `Request confirmation email failed for onboarding request email=${email}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return { submitted: true };
  }

  async approveRequest(tenantId: string) {
    const inviteToken = createInviteToken();
    const inviteTokenHash = hashInviteToken(inviteToken);

    const approval = await this.db.withSystemContext(async (tx) => {
      const record = await this.onboardingRepository.findRequestDetails(tenantId);

      if (!record) {
        throw new NotFoundException('Onboarding request not found');
      }

      const subdomain = await this.resolveUniqueSubdomain(
        record.businessName ?? record.tenantName,
        tx,
      );
      const adminDomain = buildAdminDomain(subdomain);

      await this.onboardingRepository.updateTenantSlug(tenantId, subdomain, tx);
      await this.onboardingRepository.upsertDomainConfig(
        {
          id: generateId('tenantDomainConfig'),
          tenantId,
          subdomain,
          adminDomain,
        },
        tx,
      );
      await this.onboardingRepository.markInviteSent(tenantId, inviteTokenHash, tx);

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

    // Invite link points to the web app's admin setup page on the tenant's subdomain.
    const inviteLink = `https://${approval.subdomain}.sneakereco.com/admin/setup/${inviteToken}`;

    await this.email.sendOnboardingInvite({
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
      const record = await this.onboardingRepository.findDenialDetails(tenantId);

      if (!record) {
        throw new NotFoundException('Onboarding request not found');
      }

      await this.onboardingRepository.markRejected(tenantId, tx);
      return record;
    });

    if (denial.email) {
      await this.email.sendOnboardingDenial({
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
      const existingUserBySub = await this.onboardingRepository.findUserByCognitoSub(cognitoSub, tx);

      if (existingUserBySub) {
        await this.onboardingRepository.insertTenantMember(
          {
            id: generateId('tenantMember'),
            tenantId: inviteRecord.tenantId,
            userId: existingUserBySub.id,
            role: 'admin',
            isOwner: true,
          },
          tx,
        );
        await this.onboardingRepository.markInviteAccepted(inviteRecord.tenantId, tx);
        return;
      }

      const existingUserByEmail = await this.onboardingRepository.findUserByEmail(email, tx);

      if (existingUserByEmail?.cognitoSub && existingUserByEmail.cognitoSub !== cognitoSub) {
        throw new ConflictException('An account with this email already exists');
      }

      const userId = existingUserByEmail?.id ?? generateId('user');

      if (existingUserByEmail) {
        await this.onboardingRepository.updateUserCognitoSub(
          existingUserByEmail.id,
          cognitoSub,
          email,
          inviteRecord.requestedByName,
          tx,
        );
      } else {
        await this.onboardingRepository.insertUser(
          {
            id: userId,
            email,
            fullName: inviteRecord.requestedByName,
            cognitoSub,
          },
          tx,
        );
      }

      await this.onboardingRepository.insertTenantMember(
        {
          id: generateId('tenantMember'),
          tenantId: inviteRecord.tenantId,
          userId,
          role: 'admin',
          isOwner: true,
        },
        tx,
      );
      await this.onboardingRepository.markInviteAccepted(inviteRecord.tenantId, tx);
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
      adminRedirectUrl: `https://${inviteRecord.adminDomain}/admin`,
      expiresIn: authResult.expiresIn,
      idToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      secretCode,
    };
  }

  private async getInviteRecord(token: string) {
    const inviteTokenHash = hashInviteToken(token);
    const record = await this.onboardingRepository.findByInviteTokenHash(inviteTokenHash);

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

  private async resolveUniqueSubdomain(source: string, tx: DrizzleTransaction): Promise<string> {
    const baseSlug = buildCandidateSlug(source);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;

      const slugTaken = await this.onboardingRepository.isTenantSlugTaken(candidate, tx);
      const subdomainTaken = await this.onboardingRepository.isDomainSubdomainTaken(candidate, tx);

      if (!slugTaken && !subdomainTaken) {
        return candidate;
      }
    }

    throw new InternalServerErrorException('Unable to allocate a unique tenant subdomain');
  }

  private getPlatformBaseUrl(): string {
    return this.config.getOrThrow<string>('PLATFORM_URL').replace(/\/$/, '');
  }
}
