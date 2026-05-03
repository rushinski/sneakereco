import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { authSubjectRevocations } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

interface AuthSubjectRevocationRecord {
  id: string;
  cognitoSub: string;
  userPoolId: string;
  revokeBefore: string;
}

@Injectable()
export class AuthSubjectRevocationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async upsert(
    cognitoSub: string,
    userPoolId: string,
    revokeBefore: string,
  ): Promise<AuthSubjectRevocationRecord> {
    const id = generateId('authSubjectRevocation');
    const revokeBeforeDate = new Date(revokeBefore);
    const [row] = await this.database.db
      .insert(authSubjectRevocations)
      .values({ id, cognitoSub, userPoolId, revokeBefore: revokeBeforeDate })
      .onConflictDoUpdate({
        target: [authSubjectRevocations.cognitoSub, authSubjectRevocations.userPoolId],
        set: { revokeBefore: revokeBeforeDate, updatedAt: new Date() },
      })
      .returning();
    return this.toRecord(row!);
  }

  async findBySubject(
    cognitoSub: string,
    userPoolId: string,
  ): Promise<AuthSubjectRevocationRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(authSubjectRevocations)
      .where(
        and(
          eq(authSubjectRevocations.cognitoSub, cognitoSub),
          eq(authSubjectRevocations.userPoolId, userPoolId),
        ),
      )
      .limit(1);
    return row ? this.toRecord(row) : null;
  }

  private toRecord(
    row: typeof authSubjectRevocations.$inferSelect,
  ): AuthSubjectRevocationRecord {
    return {
      id: row.id,
      cognitoSub: row.cognitoSub,
      userPoolId: row.userPoolId,
      revokeBefore: row.revokeBefore.toISOString(),
    };
  }
}
