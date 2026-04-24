import { Injectable } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import { authSessionLineageRevocations, authSubjectRevocations } from '@sneakereco/db';
import { generateId } from '@sneakereco/shared';

import { DatabaseService } from '../../../core/database/database.service';

@Injectable()
export class SessionControlRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertLineageRevocation(input: {
    cognitoSub: string;
    userPoolId: string;
    originJti: string;
    surfaceKey: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.systemDb
      .insert(authSessionLineageRevocations)
      .values({
        id: generateId('authSessionLineageRevocation'),
        cognitoSub: input.cognitoSub,
        userPoolId: input.userPoolId,
        originJti: input.originJti,
        surfaceKey: input.surfaceKey,
        expiresAt: input.expiresAt,
      })
      .onConflictDoNothing();
  }

  async upsertSubjectRevocation(input: {
    cognitoSub: string;
    userPoolId: string;
    revokeBefore: Date;
  }): Promise<void> {
    await this.db.systemDb
      .insert(authSubjectRevocations)
      .values({
        id: generateId('authSubjectRevocation'),
        cognitoSub: input.cognitoSub,
        userPoolId: input.userPoolId,
        revokeBefore: input.revokeBefore,
      })
      .onConflictDoUpdate({
        target: [authSubjectRevocations.cognitoSub, authSubjectRevocations.userPoolId],
        set: {
          revokeBefore: input.revokeBefore,
          updatedAt: new Date(),
        },
      });
  }

  async findSubjectRevocation(input: {
    cognitoSub: string;
    userPoolId: string;
  }): Promise<Date | null> {
    const [row] = await this.db.systemDb
      .select({ revokeBefore: authSubjectRevocations.revokeBefore })
      .from(authSubjectRevocations)
      .where(
        and(
          eq(authSubjectRevocations.cognitoSub, input.cognitoSub),
          eq(authSubjectRevocations.userPoolId, input.userPoolId),
        ),
      )
      .limit(1);

    return row?.revokeBefore ?? null;
  }

  async hasLineageRevocation(input: {
    cognitoSub: string;
    userPoolId: string;
    originJti: string;
    surfaceKey: string;
  }): Promise<boolean> {
    const [row] = await this.db.systemDb
      .select({ id: authSessionLineageRevocations.id })
      .from(authSessionLineageRevocations)
      .where(
        and(
          eq(authSessionLineageRevocations.cognitoSub, input.cognitoSub),
          eq(authSessionLineageRevocations.userPoolId, input.userPoolId),
          eq(authSessionLineageRevocations.originJti, input.originJti),
          eq(authSessionLineageRevocations.surfaceKey, input.surfaceKey),
          gt(authSessionLineageRevocations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return Boolean(row);
  }
}
