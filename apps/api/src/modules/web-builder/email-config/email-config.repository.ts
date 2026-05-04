import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { EmailDraft } from '../shared/web-builder.types';

@Injectable()
export class EmailDraftsRepository {
  private readonly records = new Map<string, EmailDraft>();
  private readonly counters = new Map<string, number>();

  async save(input: Omit<EmailDraft, 'id' | 'versionNumber' | 'status'>) {
    const key = `${input.tenantId}:${input.emailType}`;
    const versionNumber = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, versionNumber);
    const record: EmailDraft = {
      id: generateId('tenantEmailConfigVersion'),
      versionNumber,
      status: 'draft',
      ...input,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async markStatus(id: string, status: EmailDraft['status']) {
    const record = this.records.get(id);
    if (!record) return null;
    record.status = status;
    this.records.set(id, record);
    return record;
  }
}