import { ConflictException, Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { AuthPageDraft } from '../shared/web-builder.types';

@Injectable()
export class AuthPageDraftsRepository {
  private readonly records = new Map<string, AuthPageDraft>();
  private readonly counters = new Map<string, number>();

  async save(input: Omit<AuthPageDraft, 'id' | 'versionNumber' | 'status' | 'editorVersion'>, expectedEditorVersion?: number) {
    const key = `${input.tenantId}:${input.pageType}`;
    const current = [...this.records.values()]
      .filter((record) => record.tenantId === input.tenantId && record.pageType === input.pageType)
      .sort((a, b) => b.editorVersion - a.editorVersion)[0];

    if (current && expectedEditorVersion !== undefined && current.editorVersion !== expectedEditorVersion) {
      throw new ConflictException('Draft has been updated by another editor');
    }

    const versionNumber = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, versionNumber);
    const record: AuthPageDraft = {
      id: generateId('tenantAuthPageConfig'),
      versionNumber,
      status: 'draft',
      editorVersion: (current?.editorVersion ?? 0) + 1,
      ...input,
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async markStatus(id: string, status: AuthPageDraft['status']) {
    const record = this.records.get(id);
    if (!record) return null;
    record.status = status;
    this.records.set(id, record);
    return record;
  }
}