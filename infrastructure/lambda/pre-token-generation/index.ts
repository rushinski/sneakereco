/**
 * Pre Token Generation Lambda (V2 trigger)
 *
 * Runs after Cognito authenticates a user and before it issues tokens.
 * Injects custom claims into the ID token and access token based on
 * whether the user is a super admin or a regular tenant member.
 *
 * Super admin:
 *   - custom:is_super_admin = 'true'
 *   - No tenant claims (super admin accesses tenants via X-Tenant-ID header)
 *
 * Tenant member:
 *   - custom:is_super_admin = 'false'
 *   - custom:tenant_id = tenant ID
 *   - custom:role = 'admin' | 'customer'
 *   - custom:member_id = tenant_members.id
 *
 * The Lambda determines which tenant to bind based on the Cognito app client:
 *   - Admin app client → look for the tenant membership where is_owner = true
 *   - Customer app client → this trigger fires for both; for customer clients
 *     we still inject tenant claims if a membership exists.
 *
 * Connection: Uses SYSTEM_DATABASE_URL (bypasses RLS — Lambda is not
 * tenant-scoped and needs to read across tenants).
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

interface UserRow {
  id: string;
  is_super_admin: boolean;
}

interface MemberRow {
  id: string;
  tenant_id: string;
  role: string;
}

async function lookupUser(client: Client, cognitoSub: string): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    'SELECT id, is_super_admin FROM users WHERE cognito_sub = $1 LIMIT 1',
    [cognitoSub],
  );
  return result.rows[0] ?? null;
}

async function lookupOwnerMembership(client: Client, userId: string): Promise<MemberRow | null> {
  const result = await client.query<MemberRow>(
    `SELECT id, tenant_id, role
     FROM tenant_members
     WHERE user_id = $1 AND is_owner = true
     LIMIT 1`,
    [userId],
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

  if (!cognitoSub) {
    console.error('Pre Token Generation: missing sub in userAttributes');
    return event;
  }

  const client = await getDbClient();

  try {
    const user = await lookupUser(client, cognitoSub);

    if (!user) {
      // User authenticated in Cognito but has no DB record yet.
      // This can happen transiently; return unmodified so Cognito
      // still issues tokens (the API will 401 on auth checks).
      console.warn(`Pre Token Generation: no DB user found for sub=${cognitoSub}`);
      return event;
    }

    const customClaims: Record<string, string> = {
      'custom:is_super_admin': user.is_super_admin ? 'true' : 'false',
    };

    if (!user.is_super_admin) {
      // Inject tenant membership claims.
      // For the admin app client, bind to the owned tenant.
      const member = await lookupOwnerMembership(client, user.id);

      if (member) {
        customClaims['custom:tenant_id'] = member.tenant_id;
        customClaims['custom:role'] = member.role;
        customClaims['custom:member_id'] = member.id;
      } else {
        // Non-super-admin with no owned tenant yet — likely a customer
        // who signed up directly. Leave tenant claims absent.
        console.info(
          `Pre Token Generation: no owner membership found for userId=${user.id}; skipping tenant claims`,
        );
      }
    }

    event.response = {
      claimsAndScopeOverrideDetails: {
        idTokenGeneration: {
          claimsToAddOrOverride: customClaims,
        },
        accessTokenGeneration: {
          claimsToAddOrOverride: customClaims,
        },
      },
    };

    return event;
  } finally {
    await client.end();
  }
};
