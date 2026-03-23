const http = require("http");
const fs = require("fs");
const path = require("path");

const outFile = path.join(__dirname, "auth-flow-result.json");
const results = {};

function write(obj) {
  fs.writeFileSync(outFile, JSON.stringify(obj, null, 2));
}

const email = `qa-${Date.now()}@example.com`;
const signupBody = JSON.stringify({
  email,
  password: "TestPassword123!",
  displayName: "QA Tester",
});

function post(p, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path: p,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "x-request-id": "qa-" + Date.now(),
          "x-real-ip": "127.0.0.1",
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, raw: d.slice(0, 500) });
          }
        });
      },
    );
    req.on("error", (e) => reject(e));
    req.write(body);
    req.end();
  });
}

function get(p, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path: p,
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          "x-request-id": "qa-" + Date.now(),
          "x-real-ip": "127.0.0.1",
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, raw: d.slice(0, 500) });
          }
        });
      },
    );
    req.on("error", (e) => reject(e));
    req.end();
  });
}

async function main() {
  try {
    // Step 1: Signup
    const signup = await post("/api/auth/signup", signupBody);
    results.signup = {
      status: signup.status,
      hasToken: Boolean(signup.json?.auth?.accessToken),
      userId: signup.json?.user?.id || null,
      publicId: signup.json?.user?.publicId || null,
      role: signup.json?.user?.role || null,
      email: signup.json?.user?.email || null,
    };
    write(results);

    if (!signup.json?.auth?.accessToken) {
      results.error = "Signup failed - no token";
      results.signupRaw = signup.json || signup.raw;
      write(results);
      return;
    }

    // Step 2: Login
    const loginBody = JSON.stringify({ email, password: "TestPassword123!" });
    const login = await post("/api/auth/login", loginBody);
    results.login = {
      status: login.status,
      hasToken: Boolean(login.json?.auth?.accessToken),
      sameUser: login.json?.user?.id === signup.json?.user?.id,
    };
    write(results);

    if (!login.json?.auth?.accessToken) {
      results.error = "Login failed - no token";
      results.loginRaw = login.json || login.raw;
      write(results);
      return;
    }

    // Step 3: Session check
    const session = await get("/api/auth/session?intent=login", login.json.auth.accessToken);
    results.session = {
      status: session.status,
      portalStatus: session.json?.status || null,
      platformRole: session.json?.platformRole || null,
      agencyStatus: session.json?.agencyStatus || null,
      email: session.json?.email || null,
    };

    results.allChecksPassed = true;
    write(results);
  } catch (err) {
    results.fatalError = err.message;
    write(results);
  }
}

main();
