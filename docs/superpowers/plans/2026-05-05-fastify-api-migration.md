# Fastify API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the NestJS API from Express to a Fastify-native runtime without leaving Express adapter assumptions in active API code.

**Architecture:** Swap the Nest platform adapter to Fastify first, then replace Express-bound middleware and request/response handling with Fastify-compatible bootstrap wiring, hooks, and helper functions. Keep application behavior stable where possible, but replace cookie and CSRF internals with Fastify-native equivalents when that is the cleanest way to remove Express dependencies.

**Tech Stack:** NestJS 11, Fastify, `@nestjs/platform-fastify`, `@fastify/cookie`, `@fastify/helmet`, `@fastify/cors`, TypeScript, Jest, ts-jest, pnpm.

---

## File Structure

### Runtime and dependency wiring

- Modify: `apps/api/package.json`
  Responsibility: Replace the Express platform package with Fastify packages and remove Express-only runtime dependencies where possible.
- Modify: `apps/api/src/main.ts`
  Responsibility: Bootstrap Nest on Fastify, register Fastify plugins, move body-size and trust-proxy configuration to the adapter, and keep global Nest configuration intact.

### HTTP infrastructure

- Modify: `apps/api/src/common/context/request-context.middleware.ts`
  Responsibility: Stop using Express types and read request host/origin data from Fastify-compatible request objects.
- Modify: `apps/api/src/common/middleware/cors.middleware.ts`
  Responsibility: Preserve current custom CORS logic without Express response helpers.
- Modify: `apps/api/src/common/middleware/request-id.middleware.ts`
  Responsibility: Set request IDs and response headers without Express-specific types.
- Modify: `apps/api/src/common/filters/http-exception.filter.ts`
  Responsibility: Preserve the current error envelope while replying through Fastify-compatible response methods.

### Cross-cutting request consumers

- Modify: `apps/api/src/common/decorators/user.decorator.ts`
- Modify: `apps/api/src/common/decorators/tenant.decorator.ts`
- Modify: `apps/api/src/common/guards/csrf.guard.ts`
- Modify: `apps/api/src/common/guards/onboarding-origin.guard.ts`
- Modify: `apps/api/src/common/guards/roles.guard.ts`
- Modify: `apps/api/src/common/guards/throttler.guard.ts`
- Modify: `apps/api/src/common/interceptors/transform.interceptor.ts`
- Modify: `apps/api/src/common/interceptors/audit.interceptor.ts`
  Responsibility: Remove direct Express typing and use Nest HTTP context or narrow request shapes instead.

### Auth and security

- Modify: `apps/api/src/core/security/csrf/csrf.service.ts`
- Modify: `apps/api/src/core/security/csrf/csrf.controller.ts`
- Modify: `apps/api/src/modules/auth/shared/tokens/auth-cookie.ts`
- Modify: `apps/api/src/modules/auth/login/login.controller.ts`
- Modify: `apps/api/src/modules/auth/logout/logout.controller.ts`
- Modify: `apps/api/src/modules/auth/mfa-challenge/mfa-challenge.controller.ts`
- Modify: `apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts`
- Modify: `apps/api/src/modules/auth/otp/otp.controller.ts`
- Modify: `apps/api/src/modules/auth/refresh/refresh.controller.ts`
- Modify: `apps/api/src/modules/auth/session-control/session-control.controller.ts`
  Responsibility: Replace Express request/response usage in cookie-issuing, cookie-clearing, and CSRF-related flows.

### Tests

- Create: `apps/api/tests/unit/common/request-id.middleware.spec.ts`
  Responsibility: Lock down Fastify-compatible request ID behavior.
- Create: `apps/api/tests/unit/common/http-exception.filter.spec.ts`
  Responsibility: Lock down the preserved JSON error envelope after reply changes.
- Modify: `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts`
  Responsibility: Remove Express `cookie-parser` test wiring and exercise Fastify cookie registration.
- Modify: `apps/api/tests/unit/common/context/request-context.middleware.spec.ts`
- Modify: `apps/api/tests/unit/common/cors.middleware.spec.ts`
- Modify: `apps/api/tests/unit/modules/auth/session-control/session-control.service.spec.ts`
  Responsibility: Update mocks and request types to match Fastify-compatible code paths where needed.

## Tasks

### Task 1: Swap The API Runtime To Fastify

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Write the failing dependency and bootstrap expectations into the plan execution notes**

```json
// apps/api/package.json
{
  "dependencies": {
    "@nestjs/platform-fastify": "^11",
    "@fastify/cookie": "^10",
    "@fastify/cors": "^10",
    "@fastify/helmet": "^13"
  },
  "devDependencies": {
    "@types/express": null
  }
}
```

```ts
// apps/api/src/main.ts
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
```

- [ ] **Step 2: Run API typecheck to confirm the current Express-bound bootstrap is still the baseline**

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS before changes, with Express imports still present. This is the baseline that will be re-run after each migration slice.

- [ ] **Step 3: Replace the Express bootstrap with a Fastify bootstrap**

```ts
import 'reflect-metadata';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { SecurityConfig, BODY_SIZE_LIMIT } from './config/security.config';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    trustProxy: 'loopback',
    bodyLimit: BODY_SIZE_LIMIT,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const security = app.get(SecurityConfig);
  const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';
  const port = config.getOrThrow<number>('PORT');

  app.useLogger(app.get(Logger));

  await app.register(cookie);
  await app.register(helmet, security.helmetOptions);
  await app.register(cors, { origin: false, credentials: true });

  const requestId = app.get(RequestIdMiddleware);
  const corsMiddleware = app.get(CorsMiddleware);

  app.getHttpAdapter().getInstance().addHook('onRequest', async (request, reply) => {
    requestId.use(request, reply, () => undefined);
  });

  app.getHttpAdapter().getInstance().addHook('onRequest', async (request, reply) => {
    await new Promise<void>((resolve, reject) => {
      corsMiddleware.use(request, reply, (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor(), new TransformInterceptor());

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SneakerEco API')
      .setDescription('SneakerEco multi-tenant platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
}

bootstrap();
```

- [ ] **Step 4: Update the API package dependencies for Fastify**

```json
{
  "dependencies": {
    "@fastify/cookie": "^10",
    "@fastify/cors": "^10",
    "@fastify/helmet": "^13",
    "@nestjs/platform-fastify": "^11",
    "fastify": "^5"
  }
}
```

```json
{
  "dependencies": {
    "@nestjs/platform-express": null,
    "cookie-parser": null
  },
  "devDependencies": {
    "@types/express": null
  }
}
```

- [ ] **Step 5: Run typecheck to capture the remaining Express-coupled files**

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: FAIL with `Cannot find module 'express'` or request/reply type errors across middleware, filters, guards, and auth controllers. This is the expected red state for the next tasks.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/src/main.ts
git commit -m "refactor: bootstrap api with fastify"
```

### Task 2: Convert HTTP Infrastructure To Fastify-Compatible Request And Reply Handling

**Files:**
- Modify: `apps/api/src/common/context/request-context.middleware.ts`
- Modify: `apps/api/src/common/middleware/cors.middleware.ts`
- Modify: `apps/api/src/common/middleware/request-id.middleware.ts`
- Modify: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/tests/unit/common/request-id.middleware.spec.ts`
- Create: `apps/api/tests/unit/common/http-exception.filter.spec.ts`
- Modify: `apps/api/tests/unit/common/context/request-context.middleware.spec.ts`
- Modify: `apps/api/tests/unit/common/cors.middleware.spec.ts`

- [ ] **Step 1: Write the failing unit tests for request ID and exception envelope behavior**

```ts
import { describe, expect, it } from '@jest/globals';

import { RequestIdMiddleware } from '../../../src/common/middleware/request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('sets a response request id header when one is missing', () => {
    const middleware = new RequestIdMiddleware();
    const request = { headers: {} } as any;
    const reply = { header: jest.fn() } as any;

    middleware.use(request, reply, () => undefined);

    expect(typeof request.headers['x-request-id']).toBe('string');
    expect(reply.header).toHaveBeenCalledWith('X-Request-ID', request.headers['x-request-id']);
  });
});
```

```ts
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';

import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('writes the standard envelope through reply code/send', () => {
    const filter = new HttpExceptionFilter();
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    const request = { method: 'GET', url: '/v1/test', headers: { 'x-request-id': 'req_123' } };
    const host = {
      switchToHttp: () => ({
        getResponse: () => reply,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new HttpException('Nope', HttpStatus.FORBIDDEN), host);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
        meta: expect.objectContaining({ requestId: 'req_123' }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused unit tests to verify they fail against the current implementation**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/request-id.middleware.spec.ts tests/unit/common/http-exception.filter.spec.ts`

Expected: FAIL because the middleware and filter still use Express response methods and types.

- [ ] **Step 3: Replace Express request/reply types in the HTTP infrastructure**

```ts
import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

type Next = (error?: unknown) => void;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: FastifyRequest & { headers: Record<string, string | string[] | undefined> },
    res: FastifyReply,
    next: Next,
  ) {
    const incoming = req.headers['x-request-id'];
    const requestId = Array.isArray(incoming) ? incoming[0] : incoming;
    const resolvedRequestId = requestId ?? crypto.randomUUID();
    req.headers['x-request-id'] = resolvedRequestId;
    res.header('X-Request-ID', resolvedRequestId);
    next();
  }
}
```

```ts
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { code, message, details } = this.extractErrorInfo(exception, status);

    if (!isHttpException || status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    reply.code(status).send({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        requestId: request.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

- [ ] **Step 4: Update request-context and CORS middleware to use Fastify-compatible request/reply access**

```ts
import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

type Next = (error?: unknown) => void;

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  async handle(request: FastifyRequest, reply: FastifyReply, next: Next): Promise<void> {
    const origin = request.headers.origin;
    if (!origin) {
      next();
      return;
    }

    const allowAnyOrigin =
      CORS_PUBLIC_PATHS.has(request.url.split('?')[0]) &&
      (request.method === 'GET' || request.method === 'OPTIONS');

    const originContext = allowAnyOrigin
      ? { origin: 'platform' as const, tenantId: null, tenantSlug: null }
      : await this.originResolver.classifyOrigin(origin);

    const isAllowed = allowAnyOrigin || originContext.origin !== 'unknown';

    if (isAllowed) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS.join(', '));
      reply.header('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS.join(', '));
      reply.header('Access-Control-Allow-Credentials', String(CORS_CREDENTIALS));
      reply.header('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      reply.code(isAllowed ? 204 : 403).send();
      return;
    }

    next();
  }
}
```

```ts
const transportHost =
  this.originResolver.normalizeHost(this.readHeaderValue(req.headers.host) ?? req.hostname) ?? '';
```

- [ ] **Step 5: Run the focused HTTP infrastructure tests**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/request-id.middleware.spec.ts tests/unit/common/http-exception.filter.spec.ts tests/unit/common/context/request-context.middleware.spec.ts tests/unit/common/cors.middleware.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/context/request-context.middleware.ts apps/api/src/common/middleware/cors.middleware.ts apps/api/src/common/middleware/request-id.middleware.ts apps/api/src/common/filters/http-exception.filter.ts apps/api/tests/unit/common/request-id.middleware.spec.ts apps/api/tests/unit/common/http-exception.filter.spec.ts apps/api/tests/unit/common/context/request-context.middleware.spec.ts apps/api/tests/unit/common/cors.middleware.spec.ts
git commit -m "refactor: migrate api http infrastructure to fastify"
```

### Task 3: Replace Express-Bound Cookie And CSRF Handling

**Files:**
- Modify: `apps/api/src/core/security/csrf/csrf.service.ts`
- Modify: `apps/api/src/core/security/csrf/csrf.controller.ts`
- Modify: `apps/api/src/modules/auth/shared/tokens/auth-cookie.ts`
- Modify: `apps/api/src/modules/auth/login/login.controller.ts`
- Modify: `apps/api/src/modules/auth/logout/logout.controller.ts`
- Modify: `apps/api/src/modules/auth/mfa-challenge/mfa-challenge.controller.ts`
- Modify: `apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts`
- Modify: `apps/api/src/modules/auth/otp/otp.controller.ts`
- Modify: `apps/api/src/modules/auth/refresh/refresh.controller.ts`
- Modify: `apps/api/src/modules/auth/session-control/session-control.controller.ts`
- Modify: `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts`

- [ ] **Step 1: Write the failing integration expectation for cookie handling without Express parser middleware**

```ts
import { describe, expect, it } from '@jest/globals';

describe('refresh surface isolation', () => {
  it('reads the Fastify cookie registry rather than relying on cookie-parser middleware', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Origin', 'https://heatkings.sneakereco.com')
      .set('X-App-Surface', 'store-admin')
      .set('Cookie', '__Secure-sneakereco-refresh-store-admin-heatkings-sneakereco-com=abc')
      .expect(401);
  });
});
```

```ts
// remove this from the test app bootstrap
app.use(cookieParser());
```

- [ ] **Step 2: Run the focused integration test to verify it fails**

Run: `pnpm --filter @sneakereco/api test:integration -- --runTestsByPath tests/integration/auth/refresh-surface-isolation.spec.ts`

Expected: FAIL because the current auth cookie and CSRF flow assume Express request cookies and Express response cookie helpers.

- [ ] **Step 3: Replace the CSRF service with a Fastify-native double-submit implementation**

```ts
import { randomBytes, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { RequestCtx } from '../../../common/context/request-context';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_IGNORED_METHODS,
} from '../../../config/security.config';
import { buildSurfaceCookieNames, buildSurfaceKey } from '../../../modules/auth/shared/tokens/auth-cookie';

@Injectable()
export class CsrfService {
  generateToken(req: FastifyRequest, reply: FastifyReply): string {
    const token = randomBytes(32).toString('base64url');
    const cookieName = this.resolveCookieName();

    reply.setCookie(cookieName, token, {
      sameSite: 'none',
      path: AUTH_COOKIE_PATH,
      secure: true,
      httpOnly: true,
      partitioned: true,
    });

    return token;
  }

  protect(req: FastifyRequest): void {
    if (CSRF_IGNORED_METHODS.includes(req.method)) {
      return;
    }

    const cookieName = this.resolveCookieName();
    const cookieToken = req.cookies[cookieName];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
      throw new Error('Invalid CSRF token');
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new Error('Invalid CSRF token');
    }
  }

  isInvalidTokenError(error: unknown): boolean {
    return error instanceof Error && error.message === 'Invalid CSRF token';
  }

  private resolveCookieName(): string {
    const ctx = RequestCtx.get();
    if (!ctx || ctx.surface === 'unknown') {
      return CSRF_COOKIE_NAME;
    }

    const surfaceKey = buildSurfaceKey({
      surface: ctx.surface,
      canonicalHost: ctx.canonicalHost,
      host: ctx.host,
    });

    return buildSurfaceCookieNames(surfaceKey).csrf;
  }
}
```

- [ ] **Step 4: Move auth cookie helpers and controllers to Fastify request/reply APIs**

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';

export function readRefreshCookie(request: FastifyRequest, surface?: UserType): string | null {
  const surfaceKey = resolveCurrentSurfaceKey(request, surface);
  if (!surfaceKey) {
    return null;
  }

  const cookieName = buildSurfaceCookieNames(surfaceKey).refresh;
  return request.cookies[cookieName] ?? null;
}

export function clearAuthCookies(
  request: FastifyRequest,
  reply: FastifyReply,
  security: SecurityConfig,
  surface?: UserType,
): void {
  const surfaceKey = resolveCurrentSurfaceKey(request, surface);
  if (!surfaceKey) {
    return;
  }

  const cookieNames = buildSurfaceCookieNames(surfaceKey);

  reply.clearCookie(cookieNames.refresh, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    partitioned: true,
  });

  reply.clearCookie(cookieNames.csrf, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: AUTH_COOKIE_PATH,
    partitioned: true,
  });
}
```

```ts
@Post('login')
async login(
  @Body() body: LoginDto,
  @Req() request: FastifyRequest,
  @Res({ passthrough: true }) reply: FastifyReply,
) {
  return buildLoginResponse(request, reply, this.security, this.csrfService, result, userType);
}
```

- [ ] **Step 5: Run the auth integration and unit suites**

Run: `pnpm --filter @sneakereco/api test:integration -- --runTestsByPath tests/integration/auth/refresh-surface-isolation.spec.ts tests/integration/auth/password-reset-surface.spec.ts tests/integration/auth/revoke-all-sessions.spec.ts`

Expected: PASS

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/modules/auth/session-control/session-control.service.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/core/security/csrf/csrf.service.ts apps/api/src/core/security/csrf/csrf.controller.ts apps/api/src/modules/auth/shared/tokens/auth-cookie.ts apps/api/src/modules/auth/login/login.controller.ts apps/api/src/modules/auth/logout/logout.controller.ts apps/api/src/modules/auth/mfa-challenge/mfa-challenge.controller.ts apps/api/src/modules/auth/mfa-setup/mfa-setup.controller.ts apps/api/src/modules/auth/otp/otp.controller.ts apps/api/src/modules/auth/refresh/refresh.controller.ts apps/api/src/modules/auth/session-control/session-control.controller.ts apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts
git commit -m "refactor: migrate auth cookies and csrf to fastify"
```

### Task 4: Remove Remaining Express Typing From Guards, Decorators, And Interceptors

**Files:**
- Modify: `apps/api/src/common/decorators/user.decorator.ts`
- Modify: `apps/api/src/common/decorators/tenant.decorator.ts`
- Modify: `apps/api/src/common/guards/csrf.guard.ts`
- Modify: `apps/api/src/common/guards/onboarding-origin.guard.ts`
- Modify: `apps/api/src/common/guards/roles.guard.ts`
- Modify: `apps/api/src/common/guards/throttler.guard.ts`
- Modify: `apps/api/src/common/interceptors/transform.interceptor.ts`
- Modify: `apps/api/src/common/interceptors/audit.interceptor.ts`

- [ ] **Step 1: Write the failing full API typecheck as the red test for lingering Express imports**

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: FAIL with one or more files still importing `Request` from `express`.

- [ ] **Step 2: Replace direct Express request typing with Nest context-friendly request shapes**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestWithUser = {
  user?: {
    sub: string;
    email?: string;
    userType: string;
    tenantId?: string | null;
  };
};

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user ?? null;
  },
);
```

```ts
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthUser }>();
```

```ts
const request = context.switchToHttp().getRequest<{
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
}>();
```

- [ ] **Step 3: Run unit tests that cover the affected auth and request-context logic**

Run: `pnpm --filter @sneakereco/api test:unit -- --runTestsByPath tests/unit/common/onboarding-origin.guard.spec.ts tests/unit/modules/auth/shared/jwt.strategy.spec.ts tests/unit/common/context/request-surface.spec.ts`

Expected: PASS

- [ ] **Step 4: Run API typecheck again**

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/decorators/user.decorator.ts apps/api/src/common/decorators/tenant.decorator.ts apps/api/src/common/guards/csrf.guard.ts apps/api/src/common/guards/onboarding-origin.guard.ts apps/api/src/common/guards/roles.guard.ts apps/api/src/common/guards/throttler.guard.ts apps/api/src/common/interceptors/transform.interceptor.ts apps/api/src/common/interceptors/audit.interceptor.ts
git commit -m "refactor: remove express typing from api request consumers"
```

### Task 5: Final Verification And Dependency Cleanup

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts`

- [ ] **Step 1: Confirm no active API source still imports Express**

Run: `rg -n "from 'express'|from \"express\"|platform-express|NestExpressApplication|cookie-parser" apps/api/src apps/api/tests apps/api/package.json`

Expected: no matches

- [ ] **Step 2: Run the full API unit suite**

Run: `pnpm --filter @sneakereco/api test:unit`

Expected: PASS

- [ ] **Step 3: Run the full API integration suite**

Run: `pnpm --filter @sneakereco/api test:integration`

Expected: PASS

- [ ] **Step 4: Run the final API typecheck**

Run: `pnpm --filter @sneakereco/api typecheck`

Expected: PASS

- [ ] **Step 5: Run the final API build**

Run: `pnpm --filter @sneakereco/api build`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/tests/integration/auth/refresh-surface-isolation.spec.ts
git commit -m "chore: finalize fastify api migration"
```
