import { AsyncLocalStorage } from 'async_hooks';
import type { PoolCredentials } from '../../modules/auth/shared/cognito/cognito.types';
import type { AuthenticatedUser, UserType } from '../../modules/auth/auth.types';
import type { AppSurface, HostType } from './request-surface';

export interface RequestContext {
  requestId: string;
  host: string;
  hostType: HostType;
  surface: AppSurface;
  canonicalHost: string | null;
  isCanonicalHost: boolean;
  origin: UserType | 'unknown';
  tenantId: string | null;
  tenantSlug: string | null;
  pool: PoolCredentials | null;
  user: AuthenticatedUser | null;
}

const store = new AsyncLocalStorage<RequestContext>();

export const RequestCtx = {
  run: <T>(ctx: RequestContext, fn: () => T): T => store.run(ctx, fn),
  get: (): RequestContext | undefined => store.getStore(),
  setUser: (user: AuthenticatedUser): void => {
    const ctx = store.getStore();
    if (ctx) ctx.user = user;
  },
};
