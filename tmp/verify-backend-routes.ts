import path from "node:path";
import { readFile } from "node:fs/promises";
import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";

import { POST as signupPost } from "../apps/web/src/app/api/auth/signup/route";
import { POST as refreshPost } from "../apps/web/src/app/api/auth/refresh/route";
import { POST as logoutPost } from "../apps/web/src/app/api/auth/logout/route";
import { GET as meGet } from "../apps/web/src/app/api/user/me/route";
import { PATCH as updatePatch } from "../apps/web/src/app/api/user/update/route";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });

const cookieJar = new Map<string, string>();

function applySetCookies(response: Response) {
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.bind(response.headers);
  const values = typeof getSetCookie === "function"
    ? getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);

  for (const value of values) {
    const [cookiePart] = value.split(";");
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

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function parseResponse(response: Response) {
  applySetCookies(response);
  const text = await response.text();

  return {
    status: response.status,
    json: text ? JSON.parse(text) : null,
  };
}

function makeRequest(method: string, targetPath: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("x-request-id", `direct-${Date.now()}`);

  const cookie = cookieHeader();
  if (cookie) {
    headers.set("cookie", cookie);
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    payload = JSON.stringify(body);
  }

  return new Request(`http://local.test${targetPath}`, {
    method,
    headers,
    body: payload,
  });
}

async function ensureRequiredSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    for (const fileName of [
      "0017_missu_host_program.sql",
      "0018_clerk_webhook_events.sql",
      "0019_missu_pro_saas_backend.sql",
    ]) {
      const sql = await readFile(path.resolve(process.cwd(), "packages", "db", "migrations", fileName), "utf8");
      await pool.query(sql.replaceAll("--> statement-breakpoint", ""));
    }
  } finally {
    await pool.end();
  }
}

async function verifyTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query(
      `select
        to_regclass('public.host_requests') as host_requests,
        to_regclass('public.agency_requests') as agency_requests,
        to_regclass('public.outbox_events') as outbox_events`
    );

    const row = result.rows[0] ?? {};
    const missing = Object.entries(row)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing migrated tables: ${missing.join(", ")}`);
    }

    return row;
  } finally {
    await pool.end();
  }
}

async function main() {
  await ensureRequiredSchema();
  const schema = await verifyTables();

  const stamp = Date.now().toString(36);
  const email = `copilot.${stamp}@example.com`;
  const username = `copilot_${stamp}`.slice(0, 32);

  const signup = await parseResponse(await signupPost(makeRequest("POST", "/api/auth/signup", {
    email,
    password: "SmokeTest123!",
    displayName: "Copilot Smoke",
    username,
    country: "US",
    preferredLocale: "en",
    preferredTimezone: "UTC",
  })));

  if (signup.status !== 201) {
    throw new Error(`Signup failed: ${signup.status} ${JSON.stringify(signup.json)}`);
  }

  const me = await parseResponse(await meGet(makeRequest("GET", "/api/user/me")));
  if (me.status !== 200) {
    throw new Error(`GET /api/user/me failed: ${me.status} ${JSON.stringify(me.json)}`);
  }

  const csrfToken = cookieJar.get("missu_csrf_token");
  if (!csrfToken) {
    throw new Error("Missing CSRF cookie after signup");
  }

  const update = await parseResponse(await updatePatch(makeRequest(
    "PATCH",
    "/api/user/update",
    { city: "Seattle", preferredTimezone: "America/Los_Angeles" },
    { "x-csrf-token": csrfToken },
  )));

  if (update.status !== 200) {
    throw new Error(`PATCH /api/user/update failed: ${update.status} ${JSON.stringify(update.json)}`);
  }

  const refresh = await parseResponse(await refreshPost(makeRequest("POST", "/api/auth/refresh")));
  if (refresh.status !== 200) {
    throw new Error(`POST /api/auth/refresh failed: ${refresh.status} ${JSON.stringify(refresh.json)}`);
  }

  const logout = await parseResponse(await logoutPost(makeRequest("POST", "/api/auth/logout")));
  if (logout.status !== 200) {
    throw new Error(`POST /api/auth/logout failed: ${logout.status} ${JSON.stringify(logout.json)}`);
  }

  const meAfterLogout = await parseResponse(await meGet(makeRequest("GET", "/api/user/me")));
  if (meAfterLogout.status !== 401) {
    throw new Error(`Expected 401 after logout, got ${meAfterLogout.status} ${JSON.stringify(meAfterLogout.json)}`);
  }

  console.log(JSON.stringify({
    schema,
    email,
    username,
    signupStatus: signup.status,
    meStatus: me.status,
    updateStatus: update.status,
    refreshStatus: refresh.status,
    logoutStatus: logout.status,
    meAfterLogoutStatus: meAfterLogout.status,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});