const http = require("http");
const fs = require("fs");
const path = require("path");

const outFile = path.join(__dirname, "health-check.txt");

// First, just check if the server is reachable
http.get("http://localhost:3001/api/health", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    fs.writeFileSync(outFile, `HEALTH: ${res.statusCode} ${data}\n`);
    
    // Now try signup
    const signupData = JSON.stringify({ email: `qa${Date.now()}@t.com`, password: "Pass1234!", displayName: "QA" });
    const req = http.request({
      hostname: "localhost",
      port: 3001,
      path: "/api/auth/signup",
      method: "POST",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(signupData), "x-request-id": "qa", "x-real-ip": "127.0.0.1" },
    }, (signupRes) => {
      let body = "";
      signupRes.on("data", (chunk) => body += chunk);
      signupRes.on("end", () => {
        fs.appendFileSync(outFile, `SIGNUP: ${signupRes.statusCode} ${body.slice(0, 500)}\n`);
      });
    });
    req.on("error", (e) => fs.appendFileSync(outFile, `SIGNUP_ERROR: ${e.message}\n`));
    req.write(signupData);
    req.end();
  });
}).on("error", (e) => {
  fs.writeFileSync(outFile, `HEALTH_ERROR: ${e.message}\n`);
});
