import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3002";
const cookieJar = new Map();

function applySetCookies(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const values = typeof getSetCookie === "function"
    ? getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);

  for (const value of values.filter(Boolean)) {
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

async function request(method, targetPath, body, extraHeaders = {}) {
  const headers = {
    "content-type": "application/json",
    "x-request-id": `smoke-${Date.now()}`,
    ...extraHeaders,
  };

  const cookie = cookieHeader();
  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(`${baseUrl}${targetPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  applySetCookies(response);

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, json };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // wait and retry
    }

    await delay(1000);
  }

  throw new Error(`Server did not become ready at ${baseUrl}`);
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
      throw new Error(`Missing migrated tables: ${missing.join(', ')}`);
    }

    return row;
  } finally {
    await pool.end();
  }
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

async function main() {
  await ensureRequiredSchema();
  const schema = await verifyTables();
  await waitForServer();

  const stamp = Date.now().toString(36);
  const email = `copilot.${stamp}@example.com`;
  const username = `copilot_${stamp}`.slice(0, 32);

  const signup = await request("POST", "/api/auth/signup", {
    email,
    password: "SmokeTest123!",
    displayName: "Copilot Smoke",
    username,
    country: "US",
    preferredLocale: "en",
    preferredTimezone: "UTC",
  });

  if (signup.status !== 201) {
    throw new Error(`Signup failed: ${signup.status} ${JSON.stringify(signup.json)}`);
  }

  const me = await request("GET", "/api/user/me");
  if (me.status !== 200) {
    throw new Error(`GET /api/user/me failed: ${me.status} ${JSON.stringify(me.json)}`);
  }

  const csrfToken = cookieJar.get("missu_csrf_token");
  if (!csrfToken) {
    throw new Error("Missing CSRF cookie after signup");
  }

  const update = await request(
    "PATCH",
    "/api/user/update",
    { city: "Seattle", preferredTimezone: "America/Los_Angeles" },
    { "x-csrf-token": csrfToken }
  );

  if (update.status !== 200) {
    throw new Error(`PATCH /api/user/update failed: ${update.status} ${JSON.stringify(update.json)}`);
  }

  const refresh = await request("POST", "/api/auth/refresh");
  if (refresh.status !== 200) {
    throw new Error(`POST /api/auth/refresh failed: ${refresh.status} ${JSON.stringify(refresh.json)}`);
  }

  const logout = await request("POST", "/api/auth/logout");
  if (logout.status !== 200) {
    throw new Error(`POST /api/auth/logout failed: ${logout.status} ${JSON.stringify(logout.json)}`);
  }

  const meAfterLogout = await request("GET", "/api/user/me");
  if (meAfterLogout.status !== 401) {
    throw new Error(`Expected 401 after logout, got ${meAfterLogout.status} ${JSON.stringify(meAfterLogout.json)}`);
  }

  const result = {
    baseUrl,
    schema,
    email,
    username,
    signupStatus: signup.status,
    meStatus: me.status,
    updateStatus: update.status,
    refreshStatus: refresh.status,
    logoutStatus: logout.status,
    meAfterLogoutStatus: meAfterLogout.status,
  };

  await writeFile(path.resolve(process.cwd(), "tmp", "verify-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeFile(path.resolve(process.cwd(), "tmp", "verify-result-error.txt"), `${message}\n`, "utf8").catch(() => undefined);
  console.error(message);
  process.exit(1);
});