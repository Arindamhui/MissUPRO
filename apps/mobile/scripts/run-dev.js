/* eslint-disable @typescript-eslint/no-require-imports */
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const metroPort = Number(
  process.env.MOBILE_DEV_PORT ||
    process.env.EXPO_DEV_PORT ||
    process.env.MOBILE_ANDROID_METRO_PORT ||
    8081,
);
const extraArgs = process.argv.slice(2);

function getExpoCliPath() {
  const expoPackageJson = require.resolve("expo/package.json", { paths: [projectRoot] });
  const expoPackage = require(expoPackageJson);
  return path.join(path.dirname(expoPackageJson), expoPackage.bin.expo);
}

function isPortBusy(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        resolve(true);
        return;
      }

      resolve(true);
    });

    server.once("listening", () => {
      server.close((closeError) => {
        if (closeError) {
          resolve(true);
          return;
        }

        resolve(false);
      });
    });

    server.listen(port, "::");
  });
}

function holdProcessOpen() {
  console.log(`[mobile:dev] Reusing Metro on port ${metroPort}.`);
  const timer = setInterval(() => undefined, 60_000);

  const shutdown = () => {
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  if (await isPortBusy(metroPort)) {
    holdProcessOpen();
    return;
  }

  const child = spawn(
    process.execPath,
    [getExpoCliPath(), "start", "--port", String(metroPort), ...extraArgs],
    {
      cwd: projectRoot,
      env: { ...process.env, CI: "1" },
      stdio: "inherit",
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[mobile:dev] ${error.message}`);
  process.exit(1);
});