import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { AuditEventRecord } from './audit.types';

@Injectable()
export class AuditService {
  private readonly records = new Map<string, AuditEventRecord>();

  async record(input: Omit<AuditEventRecord, 'id' | 'occurredAt'> & { occurredAt?: string }) {
    const record: AuditEventRecord = {
      id: generateId('auditEvent'),
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      eventName: input.eventName,
      actorType: input.actorType,
      actorId: input.actorId,
      tenantId: input.tenantId,
      metadata: input.metadata,
    };

    this.records.set(record.id, record);
    return record;
  }

  async list(filters?: {
    tenantId?: string;
    eventName?: string;
    actorType?: string;
  }) {
    return [...this.records.values()].filter((record) => {
      if (filters?.tenantId && record.tenantId !== filters.tenantId) {
        return false;
      }
      if (filters?.eventName && record.eventName !== filters.eventName) {
        return false;
      }
      if (filters?.actorType && record.actorType !== filters.actorType) {
        return false;
      }
      return true;
    });
  }
}