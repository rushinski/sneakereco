import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenantHostnames } from '@sneakereco/db';

import { DatabaseService } from '../../core/database/database.service';
import type { RequestHostRow } from './request-host.types';

@Injectable()
export class RequestHostRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByHostname(hostname: string): Promise<RequestHostRow | null> {
    const [row] = await this.db.systemDb
      .select({
        hostname: tenantHostnames.hostname,
        tenantId: tenantHostnames.tenantId,
        surface: tenantHostnames.surface,
        hostKind: tenantHostnames.hostKind,
        isCanonical: tenantHostnames.isCanonical,
        redirectToHostname: tenantHostnames.redirectToHostname,
        status: tenantHostnames.status,
      })
      .from(tenantHostnames)
      .where(eq(tenantHostnames.hostname, hostname))
      .limit(1);

    return row ?? null;
  }
}
