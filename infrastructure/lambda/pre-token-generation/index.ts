/**
 * Pre Token Generation Lambda (V2 trigger)
 *
 * Attached to every TENANT Cognito user pool (not the platform pool).
 * Runs after Cognito authenticates a user, before tokens are issued.
 *
 * Injects tenant membership claims into both the ID token and access token:
 *   - custom:tenant_id  — the tenant this pool belongs to
 *   - custom:role       — 'admin' | 'customer'
 *   - custom:member_id  — tenant_members.id
 *
 * How the tenant is resolved:
 *   The event carries the userPoolId. We query tenant_cognito_config to map
 *   poolId → tenantId, then look up the user's membership for that tenant.
 *
 * If no membership row exists yet (e.g. the user record is being created
 * during completeOnboarding) we return the event unmodified — Cognito still
 * issues tokens and the API will handle the missing claims.
 *
 * Connection: Uses SYSTEM_DATABASE_URL (bypasses RLS).
 */

import { Client } from 'pg';

// ---------------------------------------------------------------------------
// AWS Cognito Pre Token Generation V2 event types
// ---------------------------------------------------------------------------

interface PreTokenGenerationV2Event {
  version: '2' | '3';
  triggerSource: string;
  region: string;
  userPoolId: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  request: {
    userAttributes: Record<string, string>;
    groupConfiguration: {
      groupsToOverride?: string[];
      iamRolesToOverride?: string[];
      preferredRole?: string;
    };
    scopes?: string[];
  };
  response: {
    claimsAndScopeOverrideDetails?: {
      idTokenGeneration?: {
        claimsToAddOrOverride?: Record<string, string>;
        claimsToSuppress?: string[];
      };
      accessTokenGeneration?: {
        claimsToAddOrOverride?: Record<string, string>;
        claimsToSuppress?: string[];
        scopesToAdd?: string[];
        scopesToSuppress?: string[];
      };
    };
  };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getDbClient(): Promise<Client> {
  const connectionString = process.env['SYSTEM_DATABASE_URL'];
  if (!connectionString) {
    throw new Error('SYSTEM_DATABASE_URL environment variable is not set');
  }
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

async function resolveTenantId(client: Client, userPoolId: string): Promise<string | null> {
  const result = await client.query<{ tenant_id: string }>(
    'SELECT tenant_id FROM tenant_cognito_config WHERE user_pool_id = $1 LIMIT 1',
    [userPoolId],
  );
  return result.rows[0]?.tenant_id ?? null;
}

async function lookupUserId(client: Client, cognitoSub: string): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM users WHERE cognito_sub = $1 LIMIT 1',
    [cognitoSub],
  );
  return result.rows[0]?.id ?? null;
}

async function lookupMembership(
  client: Client,
  userId: string,
  tenantId: string,
): Promise<{ id: string; role: string } | null> {
  const result = await client.query<{ id: string; role: string }>(
    `SELECT id, role
     FROM tenant_members
     WHERE user_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [userId, tenantId],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler = async (
  event: PreTokenGenerationV2Event,
): Promise<PreTokenGenerationV2Event> => {
  const cognitoSub = event.request.userAttributes['sub'];
  const userPoolId = event.userPoolId;

  if (!cognitoSub) {
    console.error('Pre Token Generation: missing sub in userAttributes');
    return event;
  }

  const client = await getDbClient();

  try {
    const tenantId = await resolveTenantId(client, userPoolId);

    if (!tenantId) {
      // Should never happen if the Lambda is only attached to tenant pools.
      console.error(`Pre Token Generation: no tenant found for poolId=${userPoolId}`);
      return event;
    }

    const userId = await lookupUserId(client, cognitoSub);

    if (!userId) {
      // User authenticated in Cognito but has no DB record yet — transient
      // during completeOnboarding. Return unmodified; the API will handle it.
      console.warn(`Pre Token Generation: no DB user found for sub=${cognitoSub}`);
      return event;
    }

    const membership = await lookupMembership(client, userId, tenantId);

    if (!membership) {
      console.warn(
        `Pre Token Generation: no membership for userId=${userId} tenantId=${tenantId}`,
      );
      return event;
    }

    const customClaims: Record<string, string> = {
      'custom:tenant_id': tenantId,
      'custom:role': membership.role,
      'custom:member_id': membership.id,
    };

    event.response = {
      claimsAndScopeOverrideDetails: {
        idTokenGeneration: { claimsToAddOrOverride: customClaims },
        accessTokenGeneration: { claimsToAddOrOverride: customClaims },
      },
    };

    return event;
  } finally {
    await client.end();
  }
};
