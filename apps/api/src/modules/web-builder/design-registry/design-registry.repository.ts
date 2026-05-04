import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

@Injectable()
export class DesignFamilyRegistryRepository {
  private readonly records = [
    {
      id: generateId('designFamily'),
      key: 'auth-family-a',
      pageFamilyKey: 'page-family-a',
      authFamilyKey: 'auth-family-a',
      emailFamilyKey: 'email-family-a',
      name: 'Auth Family A',
    },
    {
      id: generateId('designFamily'),
      key: 'auth-family-b',
      pageFamilyKey: 'page-family-b',
      authFamilyKey: 'auth-family-b',
      emailFamilyKey: 'email-family-b',
      name: 'Auth Family B',
    },
  ];

  async list() {
    return this.records;
  }

  async findById(id: string) {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async findByKey(key: string) {
    return this.records.find((record) => record.key === key) ?? null;
  }
}