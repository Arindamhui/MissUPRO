const http = require("http");

const email = `test-runtime-${Date.now()}@example.com`;
const data = JSON.stringify({
  email,
  password: "TestPassword123!",
  displayName: "Runtime Tester",
});

const req = http.request(
  {
    hostname: "localhost",
    port: 3001,
    path: "/api/auth/signup",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(data),
      "x-request-id": "runtime-test-" + Date.now(),
      "x-real-ip": "127.0.0.1",
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(body);
        console.log("SIGNUP_STATUS:", res.statusCode);
        console.log("TOKEN:", json.auth?.accessToken ? "present" : "missing");
        console.log("SESSION_ID:", json.auth?.sessionId || "missing");
        console.log("USER_ID:", json.user?.id || "missing");
        console.log("PUBLIC_ID:", json.user?.publicId || "missing");
        console.log("ROLE:", json.user?.role || "missing");
        console.log("EMAIL:", json.user?.email || "missing");

        if (!json.auth?.accessToken) {
          console.log("RESPONSE:", JSON.stringify(json).slice(0, 300));
          process.exit(1);
        }

        // Now test login with same credentials
        const loginData = JSON.stringify({ email, password: "TestPassword123!" });
        const loginReq = http.request(
          {
            hostname: "localhost",
            port: 3001,
            path: "/api/auth/login",
            method: "POST",
            headers: {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(loginData),
              "x-request-id": "runtime-login-" + Date.now(),
              "x-real-ip": "127.0.0.1",
            },
          },
          (loginRes) => {
            let loginBody = "";
            loginRes.on("data", (chunk) => (loginBody += chunk));
            loginRes.on("end", () => {
              try {
                const loginJson = JSON.parse(loginBody);
                console.log("\nLOGIN_STATUS:", loginRes.statusCode);
                console.log("LOGIN_TOKEN:", loginJson.auth?.accessToken ? "present" : "missing");
                console.log("LOGIN_USER_ID:", loginJson.user?.id || "missing");
                console.log("SAME_USER:", loginJson.user?.id === json.user?.id ? "YES" : "NO");

                if (!loginJson.auth?.accessToken) {
                  console.log("LOGIN_RESPONSE:", JSON.stringify(loginJson).slice(0, 300));
                  process.exit(1);
                }

                // Test session endpoint
                const sessionReq = http.request(
                  {
                    hostname: "localhost",
                    port: 3001,
                    path: "/api/auth/session?intent=login",
                    method: "GET",
                    headers: {
                      authorization: `Bearer ${loginJson.auth.accessToken}`,
                      "x-request-id": "runtime-session-" + Date.now(),
                      "x-real-ip": "127.0.0.1",
                    },
                  },
                  (sessionRes) => {
                    let sessionBody = "";
                    sessionRes.on("data", (chunk) => (sessionBody += chunk));
                    sessionRes.on("end", () => {
                      try {
                        const sessionJson = JSON.parse(sessionBody);
                        console.log("\nSESSION_STATUS:", sessionRes.statusCode);
                        console.log("SESSION_PORTAL_STATUS:", sessionJson.status);
                        console.log("SESSION_EMAIL:", sessionJson.email || "missing");
                        console.log("SESSION_PLATFORM_ROLE:", sessionJson.platformRole || "missing");
                        console.log("SESSION_AGENCY_STATUS:", sessionJson.agencyStatus || "missing");
                        console.log("\nALL_RUNTIME_CHECKS_PASSED");
                      } catch (e) {
                        console.log("SESSION_ERROR:", sessionBody.slice(0, 200));
                      }
                    });
                  },
                );
                sessionReq.end();
              } catch (e) {
                console.log("LOGIN_ERROR:", loginBody.slice(0, 200));
              }
            });
          },
        );
        loginReq.write(loginData);
        loginReq.end();
      } catch (e) {
        console.log("SIGNUP_ERROR:", body.slice(0, 200));
      }
    });
  },
);
req.write(data);
req.end();
