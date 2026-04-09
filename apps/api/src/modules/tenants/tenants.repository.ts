import { Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { tenantOnboarding } from '@sneakereco/db';

import { DatabaseService } from '../../common/database/database.service';
import type { ListRequestsDto } from './dto/list-requests.dto';

export interface RequestSummary {
  tenantId: string;
  businessName: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  instagramUrl: string | null;
  requestStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TenantsRepository {
  constructor(private readonly db: DatabaseService) {}

  async listRequests(dto: ListRequestsDto): Promise<{ items: RequestSummary[]; total: number }> {
    const offset = (dto.page - 1) * dto.pageSize;

    const where = dto.status ? eq(tenantOnboarding.requestStatus, dto.status) : undefined;

    const [items, [totalRow]] = await this.db.withSystemContext(async (tx) => {
      const rows = await tx
        .select({
          tenantId: tenantOnboarding.tenantId,
          businessName: tenantOnboarding.businessName,
          requestedByName: tenantOnboarding.requestedByName,
          requestedByEmail: tenantOnboarding.requestedByEmail,
          instagramUrl: tenantOnboarding.instagramUrl,
          requestStatus: tenantOnboarding.requestStatus,
          createdAt: tenantOnboarding.createdAt,
          updatedAt: tenantOnboarding.updatedAt,
        })
        .from(tenantOnboarding)
        .where(where)
        .orderBy(desc(tenantOnboarding.createdAt))
        .limit(dto.pageSize)
        .offset(offset);

      const totals = await tx
        .select({ total: count() })
        .from(tenantOnboarding)
        .where(where);

      return [rows, totals] as const;
    });

    return {
      items,
      total: totalRow?.total ?? 0,
    };
  }
}
