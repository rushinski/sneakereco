import { Injectable, Scope } from '@nestjs/common';

interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private context: TenantContext | null = null;

  setContext(tenantId: string, userId: string, role: string): void {
    this.context = { tenantId, userId, role };
  }

  getContext(): TenantContext | null {
    return this.context;
  }
}
