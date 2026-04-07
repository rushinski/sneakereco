import { APP_GUARD, Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { OnboardingOriginGuard } from '../src/common/guards/onboarding-origin.guard';
import { OriginResolverService } from '../src/common/origins/origin-resolver.service';
import { OnboardingController } from '../src/modules/onboarding/onboarding.controller';
import { OnboardingService } from '../src/modules/onboarding/onboarding.service';

describe('OnboardingController', () => {
  let app: INestApplication;
  const onboardingService = {
    completeOnboarding: jest.fn().mockResolvedValue({ accessToken: 'token' }),
    requestAccount: jest.fn().mockResolvedValue({ submitted: true }),
    validateInvite: jest.fn().mockResolvedValue({ email: 'owner@example.com', tenantId: 'tnt_1' }),
  };
  const originResolver = {
    isPlatformOrigin: jest.fn((origin: string) => origin === 'https://sneakereco.com'),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useClass: OnboardingOriginGuard,
        },
        {
          provide: OnboardingService,
          useValue: onboardingService,
        },
        {
          provide: OriginResolverService,
          useValue: originResolver,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows platform-origin request submissions', async () => {
    const response = await request(app.getHttpServer())
      .post('/onboarding/request')
      .set('Origin', 'https://sneakereco.com')
      .send({
        businessName: 'Rare Goods',
        email: 'owner@example.com',
        fullName: 'Taylor Owner',
        instagramHandle: '@raregoods',
        phoneNumber: '555-123-4567',
      });

    expect(response.status).toBe(201);
    expect(onboardingService.requestAccount).toHaveBeenCalledTimes(1);
  });

  it('blocks non-platform origins from onboarding routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/onboarding/invite/test-token')
      .set('Origin', 'https://tenant.sneakereco.com');

    expect(response.status).toBe(403);
    expect(onboardingService.validateInvite).not.toHaveBeenCalled();
  });
});
