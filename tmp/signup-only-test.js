const http = require("http");
const fs = require("fs");
const path = require("path");

const outFile = path.join(__dirname, "signup-result.txt");
fs.writeFileSync(outFile, "STARTING\n");

process.on("uncaughtException", (e) => {
  fs.appendFileSync(outFile, `UNCAUGHT: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});

const signupData = JSON.stringify({
  email: `qa${Date.now()}@t.com`,
  password: "Pass1234!",
  displayName: "QA",
});

fs.appendFileSync(outFile, `SENDING POST /api/auth/signup with ${signupData.length} bytes\n`);

const req = http.request(
  {
    hostname: "localhost",
    port: 3002,
    path: "/api/auth/signup",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(signupData),
      "x-request-id": "qa-signup",
      "x-real-ip": "127.0.0.1",
      "user-agent": "qa-test",
    },
    timeout: 120000,
  },
  (res) => {
    fs.appendFileSync(outFile, `GOT RESPONSE: ${res.statusCode}\n`);
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      fs.appendFileSync(outFile, `BODY (${body.length} chars): ${body.slice(0, 1000)}\n`);
      fs.appendFileSync(outFile, "DONE\n");
    });
    res.on("error", (e) => {
      fs.appendFileSync(outFile, `RES_ERROR: ${e.message}\n`);
    });
  },
);

req.on("timeout", () => {
  fs.appendFileSync(outFile, "TIMEOUT\n");
  req.destroy();
});

req.on("error", (e) => {
  fs.appendFileSync(outFile, `REQ_ERROR: ${e.message}\n`);
});

req.write(signupData);
req.end();

fs.appendFileSync(outFile, "REQUEST_SENT\n");
