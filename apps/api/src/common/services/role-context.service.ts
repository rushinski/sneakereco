import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { RoleContext } from '../../modules/auth/auth.types';
import { OriginResolverService } from './origin-resolver.service';

@Injectable()
export class RoleContextService {
  constructor(private readonly originResolver: OriginResolverService) {}

  async resolve(request: Request): Promise<RoleContext> {
    const originGroup = await this.originResolver.classifyOrigin(request.headers.origin);
    const tenantId = this.getHeaderValue(request, 'x-tenant-id');

    switch (originGroup) {
      case 'platform':
        return { role: 'platform', tenantId: undefined };
      case 'admin':
        return { role: 'admin', tenantId };
      case 'tenant': {
        const clientContext = this.getHeaderValue(request, 'x-client-context', true);

        if (!clientContext || clientContext === 'customer') {
          return { role: 'customer', tenantId };
        }

        if (clientContext === 'admin') {
          return { role: 'admin', tenantId };
        }

        throw new ForbiddenException('Invalid X-Client-Context header');
      }
      default:
        throw new ForbiddenException('Origin not allowed');
    }
  }

  private getHeaderValue(
    request: Request,
    header: string,
    lowercase = false,
  ): string | undefined {
    const rawValue = request.headers[header];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return lowercase ? trimmed.toLowerCase() : trimmed;
  }
}
