import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

import type { SentEmailRecord, SendEmailInput } from './email.types';

@Injectable()
export class SentEmailRepository {
  private readonly records = new Map<string, SentEmailRecord>();

  async create(
    input: SendEmailInput & {
      transport: 'smtp' | 'ses';
    },
  ) {
    const record: SentEmailRecord = {
      id: generateId('emailLog'),
      deliveredAt: new Date().toISOString(),
      ...input,
    };
    this.records.set(record.id, record);
    return record;
  }

  async list() {
    return [...this.records.values()];
  }

  async latest() {
    return [...this.records.values()].at(-1) ?? null;
  }
}