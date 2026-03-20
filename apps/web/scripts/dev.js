const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const defaultPort = Number(process.env.PORT || 3001);
const nextBin = require.resolve("next/dist/bin/next");
const nextDevLockPath = path.join(projectRoot, ".next", "dev", "lock");

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

async function resolvePort() {
  if (process.env.PORT) {
    return defaultPort;
  }

  for (let candidate = defaultPort; candidate < defaultPort + 20; candidate += 1) {
    if (await isPortAvailable(candidate)) {
      if (candidate !== defaultPort) {
        console.log(`[web] Port ${defaultPort} is busy; using fallback port ${candidate}`);
      }
      return candidate;
    }
  }

  return defaultPort;
}

function hasExistingDevLock() {
  return fs.existsSync(nextDevLockPath);
}

function hasHttpServer(port) {
  return new Promise((resolve) => {
    const request = http.get({ host: "127.0.0.1", port, path: "/", timeout: 1500 }, (response) => {
      response.resume();
      resolve(true);
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => resolve(false));
  });
}

function parkProcess() {
  console.log(`[web] Reusing existing Next dev server on port ${defaultPort}`);
  setInterval(() => {}, 60_000);
}

function clearStaleDevLock() {
  try {
    fs.rmSync(nextDevLockPath, { force: true });
    console.log(`[web] Removed stale Next dev lock at ${nextDevLockPath}`);
  } catch (error) {
    console.warn(`[web] Failed to remove stale dev lock: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const port = await resolvePort();

  if (port !== defaultPort && hasExistingDevLock()) {
    if (await hasHttpServer(defaultPort)) {
      parkProcess();
      return;
    }

    clearStaleDevLock();
  }

  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});