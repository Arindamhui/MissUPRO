const http = require("http");
const ts = Date.now();
const testEmail = `quick-${ts}@example.com`;
const testPass = "QuickPass123!";

function req(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost", port: 3001, path, method,
      headers: {
        ...headers,
        ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}),
        "x-request-id": `q-${ts}-${Math.random().toString(36).slice(2, 6)}`,
        "x-real-ip": "127.0.0.1",
      },
      timeout: 30000,
    };
    const r = http.request(opts, (res) => {
      let d = "";
      const cookies = res.headers["set-cookie"] || [];
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(d); } catch {}
        resolve({ status: res.statusCode, json, cookies });
      });
    });
    r.on("error", (e) => resolve({ error: e.message }));
    r.on("timeout", () => { r.destroy(); resolve({ error: "timeout" }); });
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // 1. Signup
  const sig = await req("POST", "/api/auth/signup", { email: testEmail, password: testPass, displayName: "Quick" });
  console.log("1. SIGNUP:", sig.status);
  const token = sig.json?.token;
  const allCookies = sig.cookies?.map((c) => c.split(";")[0]).join("; ");
  const csrf = sig.cookies?.find((c) => c.startsWith("missu_csrf_token="))?.split(";")[0]?.split("=").slice(1).join("=");
  console.log("   token:", token ? "YES" : "NO");
  console.log("   csrf:", csrf ? csrf.substring(0, 40) + "..." : "NOT FOUND");
  console.log("   cookies:", sig.cookies?.map((c) => c.split("=")[0]).join(", "));

  // 2. Agency signup
  const ag = await req("POST", "/api/auth/agency-signup", {
    agencyName: "Quick Agency", contactName: "Quick Tester", contactEmail: "quick@example.com", country: "IN",
  }, { authorization: `Bearer ${token}` });
  console.log("\n2. AGENCY SIGNUP:", ag.status, ag.json?.status || ag.json?.error?.code);

  // 3. Host apply
  const ha = await req("POST", "/api/host/apply", {
    talentInfo: "I have extensive streaming experience on multiple platforms including live hosting and entertainment.",
  }, { cookie: allCookies, "x-csrf-token": csrf });
  console.log("\n3. HOST APPLY:", ha.status, ha.json?.error?.code || ha.json?.data?.status || JSON.stringify(ha.json).substring(0, 200));

  process.exit(0);
})().catch((e) => console.error("FATAL:", e));
