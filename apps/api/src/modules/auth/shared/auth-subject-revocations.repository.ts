import { Injectable } from '@nestjs/common';

import { generateId } from '@sneakereco/shared';

interface AuthSubjectRevocationRecord {
  id: string;
  cognitoSub: string;
  userPoolId: string;
  revokeBefore: string;
}

@Injectable()
export class AuthSubjectRevocationsRepository {
  private readonly records = new Map<string, AuthSubjectRevocationRecord>();

  async upsert(cognitoSub: string, userPoolId: string, revokeBefore: string) {
    const key = `${cognitoSub}:${userPoolId}`;
    const existing = this.records.get(key);
    const record: AuthSubjectRevocationRecord = existing ?? {
      id: generateId('authSubjectRevocation'),
      cognitoSub,
      userPoolId,
      revokeBefore,
    };

    record.revokeBefore = revokeBefore;
    this.records.set(key, record);
    return record;
  }

  async findBySubject(cognitoSub: string, userPoolId: string) {
    return this.records.get(`${cognitoSub}:${userPoolId}`) ?? null;
  }
}