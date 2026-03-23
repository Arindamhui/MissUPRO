import assert from "node:assert/strict";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import "./test-env";

import { authService } from "@/server/services/auth-service";
import { adminService } from "@/server/services/admin-service";
import { resolveSessionAccessState } from "@/server/lib/auth-identity";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env") });

type ParsedResponse<T = unknown> = {
  status: number;
  json: T;
};

const cookieJar = new Map<string, string>();

function applySetCookies(response: Response) {
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.bind(response.headers);
  const values = typeof getSetCookie === "function"
    ? getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);

  for (const value of values) {
    const [cookiePart] = value.split(";");
    if (!cookiePart) {
      continue;
    }
    const [name, ...rawValue] = cookiePart.split("=");
    const cookieValue = rawValue.join("=");

    if (!name) {
      continue;
    }

    if (cookieValue === "") {
      cookieJar.delete(name);
      continue;
    }

    cookieJar.set(name, cookieValue);
  }
}

function cookieHeader(extraCookies?: Record<string, string>) {
  const merged = new Map(cookieJar);

  for (const [name, value] of Object.entries(extraCookies ?? {})) {
    merged.set(name, value);
  }

  return Array.from(merged.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

async function parseResponse<T>(response: Response): Promise<ParsedResponse<T>> {
  applySetCookies(response);
  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) as T : null as T,
  };
}

function expectStatus<T>(label: string, response: ParsedResponse<T>, expectedStatus: number) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} failed with status ${response.status}: ${JSON.stringify(response.json)}`);
  }
}

function makeRequest(method: string, targetPath: string, options?: {
  body?: unknown;
  bearerToken?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) {
  const headers = new Headers(options?.headers ?? {});
  headers.set("x-request-id", `auth-flow-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  headers.set("x-real-ip", "127.0.0.1");
  headers.set("user-agent", "auth-regression-test");

  if (options?.bearerToken) {
    headers.set("authorization", `Bearer ${options.bearerToken}`);
  }

  const cookie = cookieHeader(options?.cookies);
  if (cookie) {
    headers.set("cookie", cookie);
  }

  let payload: BodyInit | undefined;
  if (options?.body !== undefined) {
    headers.set("content-type", "application/json");
    payload = JSON.stringify(options.body);
  }

  return new Request(`http://local.test${targetPath}`, {
    method,
    headers,
    body: payload,
  });
}

async function verifySchema(pool: Pool) {
  const tableResult = await pool.query(`
    select
      to_regclass('public.users') as users,
      to_regclass('public.admins') as admins,
      to_regclass('public.agencies') as agencies,
      to_regclass('public.idempotency_keys') as idempotency_keys
  `);
  const tableRow = tableResult.rows[0] ?? {};
  const missingTables = Object.entries(tableRow).filter(([, value]) => !value).map(([key]) => key);
  if (missingTables.length > 0) {
    throw new Error(`Missing required tables for auth regression: ${missingTables.join(", ")}`);
  }

  const columnResult = await pool.query(`
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'google_id'
  `);
  if (columnResult.rowCount === 0) {
    throw new Error("Missing users.google_id column. Run the latest DB migration before executing this regression.");
  }
}

async function createAdminUser(pool: Pool, stamp: string) {
  const adminEmail = `copilot.admin.${stamp}@example.com`;
  const adminUsername = `copilot_admin_${stamp}`.slice(0, 32);
  const referralCode = `REFADM${stamp.toUpperCase()}`.slice(0, 15);
  const publicId = `UA${stamp.toUpperCase()}`.slice(0, 12);

  const insertedUser = await pool.query(
    `insert into public.users (
      email,
      email_verified,
      display_name,
      username,
      role,
      platform_role,
      auth_role,
      auth_provider,
      status,
      country,
      referral_code,
      public_id,
      public_user_id,
      last_active_at
    ) values (
      $1, true, $2, $3, 'ADMIN', 'ADMIN', 'admin', 'EMAIL', 'ACTIVE', 'US', $4, $5, $5, now()
    ) returning id, email`,
    [adminEmail, "Copilot Admin", adminUsername, referralCode, publicId],
  );

  const adminUser = insertedUser.rows[0];
  if (!adminUser) {
    throw new Error("Unable to create admin regression user");
  }

  await pool.query(
    `insert into public.admins (user_id, email, admin_name, is_active, mfa_enabled)
     values ($1, $2, $3, true, false)`,
    [adminUser.id, adminEmail, "Copilot Admin"],
  );

  return {
    id: adminUser.id as string,
    email: adminEmail,
  };
}

async function createSeedUser(pool: Pool, stamp: string, email: string) {
  const username = `copilot_agency_${stamp}`.slice(0, 32);
  const referralCode = `REFAG${stamp.toUpperCase()}`.slice(0, 15);
  const publicId = `UU${stamp.toUpperCase()}`.slice(0, 12);

  const insertedUser = await pool.query(
    `insert into public.users (
      email,
      email_verified,
      display_name,
      username,
      role,
      platform_role,
      auth_provider,
      status,
      country,
      referral_code,
      public_id,
      public_user_id,
      last_active_at
    ) values (
      $1, true, $2, $3, 'USER', 'USER', 'EMAIL', 'ACTIVE', 'US', $4, $5, $5, now()
    ) returning id, email`,
    [email, "Copilot Agency Owner", username, referralCode, publicId],
  );

  const user = insertedUser.rows[0];
  if (!user) {
    throw new Error("Unable to create seeded auth regression user");
  }

  return {
    id: user.id as string,
    email: user.email as string,
  };
}

async function getPortalSessionState(pool: Pool, userId: string) {
  const result = await pool.query(
    `select
      u.id,
      u.email,
      u.role,
      u.platform_role,
      u.auth_role,
      a.id as agency_id,
      a.agency_code,
      a.approval_status as agency_status
     from public.users u
     left join public.agencies a
       on (a.owner_id = u.id or a.user_id = u.id)
      and a.deleted_at is null
     where u.id = $1
     order by a.created_at desc nulls last
     limit 1`,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Missing user ${userId} while resolving portal session state`);
  }

  const accessState = resolveSessionAccessState({
    role: String(row.role ?? "USER"),
    platformRole: row.platform_role ? String(row.platform_role) : null,
    authRole: row.auth_role ? String(row.auth_role) : null,
    agencyId: row.agency_id ? String(row.agency_id) : null,
    agencyStatus: row.agency_status ? String(row.agency_status) : null,
  });

  let status = "access_denied";
  if (accessState.platformRole === "AGENCY" && accessState.agencyStatus === "APPROVED") {
    status = "agency";
  } else if (accessState.platformRole === "AGENCY") {
    status = "agency_pending_approval";
  } else if (accessState.platformRole === "USER") {
    status = "needs_agency_profile";
  }

  return {
    status,
    agencyStatus: accessState.agencyStatus,
    platformRole: accessState.platformRole,
    agencyId: row.agency_id ? String(row.agency_id) : undefined,
    agencyCode: row.agency_code ? String(row.agency_code) : undefined,
  };
}

async function createAgencyApplication(pool: Pool, userId: string, email: string) {
  const result = await pool.query(
    `insert into public.agencies (
      user_id,
      owner_id,
      agency_name,
      public_id,
      agency_code,
      contact_name,
      contact_email,
      country,
      status,
      approval_status,
      metadata_json,
      commission_tier
    ) values (
      $1,
      $1,
      'Copilot QA Agency',
      $2,
      $3,
      'Copilot Agency Owner',
      $4,
      'US',
      'ACTIVE',
      'PENDING',
      '{"panel":"agency","createdBy":"portal_signup"}'::jsonb,
      'STANDARD'
    ) returning id, agency_code`,
    [userId, `AGY${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`, `AG-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`, email],
  );

  const agency = result.rows[0];
  if (!agency) {
    throw new Error("Unable to create agency application for auth regression");
  }

  await pool.query(
    `insert into public.agency_hosts (agency_id, user_id, status)
     values ($1, $2, 'ACTIVE')
     on conflict do nothing`,
    [agency.id, userId],
  );

  await pool.query(
    `update public.users
        set auth_role = 'agency',
            platform_role = 'AGENCY',
            updated_at = now()
      where id = $1`,
    [userId],
  );

  return {
    id: String(agency.id),
    agencyCode: String(agency.agency_code),
  };
}

function installGoogleFetchMock(profile: { aud: string; email: string; name: string; picture: string; sub: string }) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.startsWith("https://oauth2.googleapis.com/tokeninfo?id_token=")) {
      return new Response(JSON.stringify(profile), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function makeAuthContext(deviceId: string) {
  return {
    requestId: `auth-flow-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ipAddress: "127.0.0.1",
    userAgent: "auth-regression-test",
    deviceId,
    idempotencyKey: null,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run verify-auth-agency-approval.ts");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await verifySchema(pool);

    const stamp = Date.now().toString(36);
    const googleEmail = `copilot.agency.${stamp}@example.com`;
    const googleSub = `google-sub-${stamp}`;
    const seededUser = await createSeedUser(pool, stamp, googleEmail);
    const restoreFetch = installGoogleFetchMock({
      aud: process.env.GOOGLE_CLIENT_ID || "test-google-client-id",
      email: googleEmail,
      name: "Copilot Agency Owner",
      picture: "https://example.com/avatar.png",
      sub: googleSub,
    });

    try {
      const firstGoogleResult = await authService.google({ idToken: "stub-google-id-token" }, makeAuthContext(`google-device-${stamp}`));

      if (!firstGoogleResult.user) {
        throw new Error("Initial Google login returned no user profile");
      }

      const firstGoogleLogin = {
        token: firstGoogleResult.auth.accessToken,
        sessionId: firstGoogleResult.auth.sessionId,
        user: {
          id: firstGoogleResult.user.id,
          email: firstGoogleResult.user.email,
          displayName: firstGoogleResult.user.displayName,
          platformRole: firstGoogleResult.platformRole,
          agencyStatus: firstGoogleResult.agencyStatus,
          authProvider: firstGoogleResult.rawAuthProvider,
        },
      };

      assert.equal(firstGoogleLogin.user.email, googleEmail);
  assert.equal(firstGoogleLogin.user.id, seededUser.id);
      assert.equal(firstGoogleLogin.user.platformRole, "USER");
      assert.equal(firstGoogleLogin.user.agencyStatus, "NONE");

      const signupIntent = await getPortalSessionState(pool, firstGoogleLogin.user.id);
      assert.equal(signupIntent.status, "needs_agency_profile");
      assert.equal(signupIntent.agencyStatus, "NONE");

      const agencySignup = await createAgencyApplication(pool, firstGoogleLogin.user.id, googleEmail);

      const pendingSession = await getPortalSessionState(pool, firstGoogleLogin.user.id);
      assert.equal(pendingSession.status, "agency_pending_approval");
      assert.equal(pendingSession.agencyStatus, "PENDING");

      const userRows = await pool.query(
        `select id, email, google_id, platform_role, auth_role from public.users where lower(email) = lower($1) or google_id = $2 order by created_at asc`,
        [googleEmail, googleSub],
      );
      assert.equal(userRows.rowCount, 1);
      assert.equal(userRows.rows[0]?.google_id, googleSub);
      assert.equal(userRows.rows[0]?.platform_role, "AGENCY");
      assert.equal(userRows.rows[0]?.auth_role, "agency");

      const admin = await createAdminUser(pool, stamp);
      const approveAgency = await adminService.approveAgency(
        {
          userId: admin.id,
          publicId: null,
          email: admin.email,
          role: "ADMIN",
          platformRole: "ADMIN",
          agencyStatus: "NONE",
          sessionId: randomUUID(),
          agencyId: null,
        },
        {
          agencyId: agencySignup.id,
          approve: true,
          assignOwnerAgencyRole: true,
        },
        {
          requestId: `approve-agency-${stamp}`,
          ipAddress: "127.0.0.1",
          userAgent: "auth-regression-test",
          deviceId: `admin-device-${stamp}`,
          idempotencyKey: null,
        },
      );
      assert.equal(approveAgency.approvalStatus, "APPROVED");

      const secondGoogleResult = await authService.google({ idToken: "stub-google-id-token" }, makeAuthContext(`google-device-approved-${stamp}`));

      if (!secondGoogleResult.user) {
        throw new Error("Second Google login returned no user profile");
      }

      const secondGoogleLogin = {
        token: secondGoogleResult.auth.accessToken,
        sessionId: secondGoogleResult.auth.sessionId,
        user: {
          id: secondGoogleResult.user.id,
          email: secondGoogleResult.user.email,
          platformRole: secondGoogleResult.platformRole,
          agencyStatus: secondGoogleResult.agencyStatus,
        },
      };

      assert.equal(secondGoogleLogin.user.id, firstGoogleLogin.user.id);
      assert.equal(secondGoogleLogin.user.platformRole, "AGENCY");
      assert.equal(secondGoogleLogin.user.agencyStatus, "APPROVED");

      const approvedSession = await getPortalSessionState(pool, secondGoogleLogin.user.id);
      assert.equal(approvedSession.status, "agency");
      assert.equal(approvedSession.agencyStatus, "APPROVED");
      assert.equal(approvedSession.agencyId, agencySignup.id);

      const finalUserRows = await pool.query(
        `select id, email, google_id from public.users where lower(email) = lower($1) or google_id = $2 order by created_at asc`,
        [googleEmail, googleSub],
      );
      assert.equal(finalUserRows.rowCount, 1);
      assert.equal(finalUserRows.rows[0]?.id, firstGoogleLogin.user.id);

      console.log(JSON.stringify({
        firstLoginUserId: firstGoogleLogin.user.id,
        agencyId: agencySignup.id,
        secondLoginUserId: secondGoogleLogin.user.id,
        approvedSession: approvedSession.status,
        approvedAgencyStatus: approvedSession.agencyStatus,
        duplicateUserCount: finalUserRows.rowCount,
      }, null, 2));
    } finally {
      restoreFetch();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});