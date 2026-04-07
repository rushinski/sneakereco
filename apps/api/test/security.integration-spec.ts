import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { SecurityController } from '../src/modules/security/security.controller';
import { SecurityService } from '../src/modules/security/security.service';

describe('SecurityController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        SecurityService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'NODE_ENV' ? 'development' : undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues a csrf token cookie and body token', async () => {
    const response = await request(app.getHttpServer()).get('/csrf-token');
    const setCookieHeader = response.headers['set-cookie'];
    const firstCookie = setCookieHeader?.[0] ?? '';

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(setCookieHeader).toBeDefined();
    expect(firstCookie).toContain('csrf_token=');
    expect(firstCookie).toContain('HttpOnly');
    expect(firstCookie).toContain('SameSite=Strict');
  });
});
