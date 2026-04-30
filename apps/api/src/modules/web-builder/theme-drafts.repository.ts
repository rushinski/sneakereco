import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { ThemeDraft } from './web-builder.types';

@Injectable()
export class ThemeDraftsRepository {
  private readonly records = new Map<string, ThemeDraft>();
  private readonly counters = new Map<string, number>();

  async save(input: Omit<ThemeDraft, 'id' | 'versionNumber' | 'status'>) {
    const versionNumber = (this.counters.get(input.tenantId) ?? 0) + 1;
    this.counters.set(input.tenantId, versionNumber);
    const record: ThemeDraft = {
      id: generateId('tenantThemeVersion'),
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

  async markStatus(id: string, status: ThemeDraft['status']) {
    const record = this.records.get(id);
    if (!record) return null;
    record.status = status;
    this.records.set(id, record);
    return record;
  }
}