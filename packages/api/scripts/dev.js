const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const distEntry = path.join(projectRoot, "dist", "main.js");

let shuttingDown = false;
const children = [];

function spawnProcess(command, args) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    shell: true,
  });

  children.push(child);
  child.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    if (code && code !== 0) {
      shuttingDown = true;
      stopAll(code);
    }
  });

  return child;
}

function stopAll(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shuttingDown = true;
    stopAll(0);
  });
}

if (!existsSync(distEntry)) {
  const bootstrapBuild = spawn("npm", ["run", "build"], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    shell: true,
  });

  bootstrapBuild.on("exit", (code) => {
    if (code && code !== 0) {
      process.exit(code);
      return;
    }

    spawnProcess("npx", ["tsc", "-w", "-p", "tsconfig.json", "--preserveWatchOutput"]);
    spawnProcess("node", ["--watch", "dist/main.js"]);
  });
} else {
  spawnProcess("npx", ["tsc", "-w", "-p", "tsconfig.json", "--preserveWatchOutput"]);
  spawnProcess("node", ["--watch", "dist/main.js"]);
}