/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const APP_ID = process.env.MOBILE_ANDROID_APPLICATION_ID || "com.missupro.app";
const DEFAULT_METRO_PORT = Number(process.env.MOBILE_ANDROID_METRO_PORT || 8081);
const FALLBACK_REACT_NATIVE_PORT = 8081;
const EMPTY_DIR_NAME = ".android-clean-empty";
const mode = process.argv[2] || "emulator";
const extraArgs = process.argv.slice(3);

function getExpoCliPath() {
  const expoPackageJson = require.resolve("expo/package.json");
  const expoPackage = require(expoPackageJson);
  return path.join(path.dirname(expoPackageJson), expoPackage.bin.expo);
}

function getAdbCommand() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb"),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe"),
  ].filter(Boolean);

  return candidates[0] || (process.platform === "win32" ? "adb.exe" : "adb");
}

function getGradleCommand() {
  return process.platform === "win32" ? "gradlew.bat" : "./gradlew";
}

function getAndroidDir() {
  return path.resolve(__dirname, "..", "android");
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;

  const candidates = [
    process.platform === "win32" && path.join(process.env.ProgramFiles || "C:\\Program Files", "Android", "Android Studio", "jbr"),
    process.platform === "win32" && path.join(process.env.ProgramFiles || "C:\\Program Files", "Android", "Android Studio", "jre"),
    process.platform === "darwin" && "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    process.platform === "darwin" && "/Applications/Android Studio.app/Contents/jre/Contents/Home",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const javaBin = path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java");
    if (fs.existsSync(javaBin)) return candidate;
  }

  return null;
}

function ensureLocalProperties() {
  const localPropsPath = path.join(getAndroidDir(), "local.properties");
  if (fs.existsSync(localPropsPath)) return;

  const sdkDir = process.env.ANDROID_HOME
    || process.env.ANDROID_SDK_ROOT
    || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk"));

  if (sdkDir && fs.existsSync(sdkDir)) {
    const escaped = sdkDir.replace(/\\/g, "\\\\");
    fs.writeFileSync(localPropsPath, `sdk.dir=${escaped}\n`, "utf8");
    console.log(`[android] Created local.properties with sdk.dir=${sdkDir}`);
  }
}

function getWorkspaceRoot() {
  return path.resolve(__dirname, "..", "..", "..");
}

function ensureEmptyMirrorDir() {
  const emptyDir = path.join(getWorkspaceRoot(), "tmp", EMPTY_DIR_NAME);
  if (!fs.existsSync(emptyDir)) {
    fs.mkdirSync(emptyDir, { recursive: true });
  }

  return emptyDir;
}

function collectAndroidBuildDirs(baseDir, maxDepth = 4, depth = 0) {
  if (!fs.existsSync(baseDir) || depth > maxDepth) {
    return [];
  }

  const results = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(baseDir, entry.name);
    if (entry.name === "android") {
      const buildDir = path.join(fullPath, "build");
      if (fs.existsSync(buildDir)) {
        results.push(buildDir);
      }
      continue;
    }

    if (entry.name === "build" && path.basename(baseDir) === "android") {
      results.push(fullPath);
      continue;
    }

    if (depth < maxDepth) {
      results.push(...collectAndroidBuildDirs(fullPath, maxDepth, depth + 1));
    }
  }

  return results;
}

function cleanDirWithRobocopy(sourceDir, targetDir) {
  if (!fs.existsSync(targetDir)) {
    return false;
  }

  const robocopyArgs = [
    sourceDir,
    targetDir,
    "/MIR",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/nc",
    "/ns",
    "/np",
  ];

  const result = run("robocopy", robocopyArgs, { stdio: "ignore", shell: true });
  if (result.error && result.error.code !== "ENOENT") {
    throw result.error;
  }

  return true;
}

function cleanAndroidBuildArtifacts() {
  if (process.platform !== "win32") {
    return;
  }

  const workspaceRoot = getWorkspaceRoot();
  const emptyDir = ensureEmptyMirrorDir();
  const targets = new Set([
    path.join(getAndroidDir(), "build"),
    path.join(getAndroidDir(), "app", "build"),
  ]);

  for (const nodeModulesDir of [
    path.join(workspaceRoot, "node_modules"),
    path.join(workspaceRoot, "apps", "mobile", "node_modules"),
  ]) {
    for (const buildDir of collectAndroidBuildDirs(nodeModulesDir)) {
      targets.add(buildDir);
    }
  }

  const existingTargets = [...targets].filter((target) => fs.existsSync(target));
  if (existingTargets.length === 0) {
    return;
  }

  console.log(`[android] Cleaning ${existingTargets.length} Android build directories.`);

  for (const target of existingTargets) {
    cleanDirWithRobocopy(emptyDir, target);
  }
}

function getDebugApkPath() {
  return path.resolve(getAndroidDir(), "app", "build", "outputs", "apk", "debug", "app-debug.apk");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio || "pipe",
    encoding: options.encoding || "utf8",
    env: options.env || process.env,
    cwd: options.cwd || process.cwd(),
    shell: options.shell || false,
  });
}

function parseConnectedDevices(adb) {
  const result = run(adb, ["devices"]);
  if (result.error || result.status !== 0 || !result.stdout) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    })
    .filter((entry) => entry.serial && entry.state === "device");
}

function getTargetDevice(adb) {
  const devices = parseConnectedDevices(adb);
  if (mode === "device") {
    return devices.find((entry) => !entry.serial.startsWith("emulator-"))?.serial ?? null;
  }

  return devices.find((entry) => entry.serial.startsWith("emulator-"))?.serial ?? null;
}

function uninstallExistingApp(adb, serial) {
  const args = serial ? ["-s", serial, "uninstall", APP_ID] : ["uninstall", APP_ID];
  const result = run(adb, args);

  if (result.error) {
    console.warn(`[android] Could not run adb uninstall: ${result.error.message}`);
    return;
  }

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status === 0) {
    if (output) {
      console.log(`[android] ${output}`);
    }
    return;
  }

  if (output.includes("Unknown package") || output.includes("DELETE_FAILED_INTERNAL_ERROR")) {
    console.log("[android] No existing app installation to remove.");
    return;
  }

  console.warn(`[android] Uninstall returned a non-zero exit code: ${output || result.status}`);
}

function installApp(adb, serial, apkPath) {
  const args = serial
    ? ["-s", serial, "install", "-r", "-d", apkPath]
    : ["install", "-r", "-d", apkPath];
  const result = run(adb, args);

  if (result.error) {
    throw new Error(`Could not run adb install: ${result.error.message}`);
  }

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status !== 0) {
    throw new Error(output || `adb install failed with exit code ${result.status}`);
  }

  if (output) {
    console.log(`[android] ${output}`);
  }
}

function launchApp(adb, serial) {
  const args = serial
    ? ["-s", serial, "shell", "monkey", "-p", APP_ID, "-c", "android.intent.category.LAUNCHER", "1"]
    : ["shell", "monkey", "-p", APP_ID, "-c", "android.intent.category.LAUNCHER", "1"];
  const result = run(adb, args);

  if (result.error) {
    throw new Error(`Could not launch app: ${result.error.message}`);
  }

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status !== 0) {
    throw new Error(output || `App launch failed with exit code ${result.status}`);
  }

  if (output) {
    console.log(`[android] ${output}`);
  }
}

function reverseMetroPort(adb, serial, metroPort) {
  if (!serial) {
    return;
  }

  const result = run(adb, ["-s", serial, "reverse", `tcp:${metroPort}`, `tcp:${metroPort}`]);
  if (result.error || result.status !== 0) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    console.warn(`[android] Could not reverse tcp:${metroPort}: ${output || result.error?.message || result.status}`);
  }
}

function reverseMetroPorts(adb, serial, metroPort) {
  reverseMetroPort(adb, serial, metroPort);

  if (metroPort !== FALLBACK_REACT_NATIVE_PORT) {
    const result = run(adb, ["-s", serial, "reverse", `tcp:${FALLBACK_REACT_NATIVE_PORT}`, `tcp:${metroPort}`]);
    if (result.error || result.status !== 0) {
      const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
      console.warn(
        `[android] Could not map tcp:${FALLBACK_REACT_NATIVE_PORT} to tcp:${metroPort}: ${output || result.error?.message || result.status}`
      );
    }
  }
}

function buildApp(env, metroPort) {
  const gradleArgs = [
    "app:assembleDebug",
    `-PreactNativeDevServerPort=${metroPort}`,
    "-PreactNativeArchitectures=" + env.ORG_GRADLE_PROJECT_reactNativeArchitectures,
  ];
  const result = process.platform === "win32"
    ? run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", getGradleCommand(), ...gradleArgs], {
        cwd: getAndroidDir(),
        env,
        stdio: "inherit",
      })
    : run(getGradleCommand(), gradleArgs, {
        cwd: getAndroidDir(),
        env,
        stdio: "inherit",
      });

  if (result.error) {
    throw new Error(`Gradle build failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Gradle build failed with exit code ${result.status}`);
  }

  const apkPath = getDebugApkPath();
  if (!fs.existsSync(apkPath)) {
    throw new Error(`Expected APK not found at ${apkPath}`);
  }

  return apkPath;
}

function startMetro(env) {
  const metroPort = Number(env.MOBILE_ANDROID_METRO_PORT || DEFAULT_METRO_PORT);
  const metroEnv = {
    ...env,
    CI: env.CI || "1",
  };

  const child = spawn(
    process.execPath,
    [
      getExpoCliPath(),
      "start",
      "--dev-client",
      "--port",
      String(metroPort),
      ...extraArgs,
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      env: metroEnv,
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    }
  );

  child.unref();
  return child;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMetroRunningOnPort(port) {
  return new Promise((resolve) => {
    const request = http.get(`http://localhost:${port}/status`, (response) => {
      let body = "";

      response.on("data", (chunk) => {
        body += chunk.toString();
      });

      response.on("end", () => {
        resolve(response.statusCode === 200 && body.includes("packager-status:running"));
      });
    });

    request.on("error", () => resolve(false));
    request.setTimeout(2_500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForMetroReady(port, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isMetroRunningOnPort(port)) {
      return true;
    }

    await sleep(1_000);
  }

  return false;
}

async function startMetroOnAvailablePort(baseEnv, preferredPort) {
  for (let candidate = preferredPort; candidate < preferredPort + 20; candidate += 1) {
    if (await isPortBusy(candidate)) {
      continue;
    }

    const envForCandidate = {
      ...baseEnv,
      ORG_GRADLE_PROJECT_reactNativeDevServerPort: String(candidate),
      MOBILE_ANDROID_METRO_PORT: String(candidate),
    };

    console.log(`[android] Starting dedicated Metro server on ${candidate}.`);
    startMetro(envForCandidate);

    if (await waitForMetroReady(candidate, 45_000)) {
      return { metroPort: candidate, env: envForCandidate };
    }

    console.warn(`[android] Metro failed to become ready on ${candidate}; trying another port.`);
  }

  throw new Error(`Unable to start Metro on any available port from ${preferredPort} to ${preferredPort + 19}.`);
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

function isMetroCompatible(port) {
  return new Promise((resolve) => {
    const query = [
      "platform=android",
      "dev=true",
      "lazy=true",
      "minify=false",
      `app=${encodeURIComponent(APP_ID)}`,
      "modulesOnly=false",
      "runModule=true",
      "excludeSource=true",
      "sourcePaths=url-server",
    ].join("&");

    const request = http.get(
      `http://localhost:${port}/.expo/.virtual-metro-entry.bundle?${query}`,
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          if (body.length < 5000) {
            body += chunk.toString();
          }
        });

        response.on("end", () => {
          resolve(response.statusCode === 200 && !body.includes("\"type\":\"InternalError\""));
        });
      }
    );

    request.on("error", () => resolve(false));
    request.setTimeout(8_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function findFreePort(startPort, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    if (!(await isPortBusy(candidate))) {
      return candidate;
    }
  }

  return null;
}

async function main() {
  const javaHome = resolveJavaHome();
  if (!javaHome) {
    throw new Error(
      "JAVA_HOME is not set and could not be auto-detected. " +
      "Install Android Studio or set JAVA_HOME to a JDK 17+ installation."
    );
  }
  console.log(`[android] Using JAVA_HOME=${javaHome}`);

  ensureLocalProperties();

  const adb = getAdbCommand();
  let metroPort = DEFAULT_METRO_PORT;
  const forceFreshMetro = extraArgs.includes("--clear");

  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    NODE_ENV: process.env.NODE_ENV || "development",
    ORG_GRADLE_PROJECT_reactNativeArchitectures:
      mode === "device" ? "arm64-v8a,armeabi-v7a" : "x86_64",
    ORG_GRADLE_PROJECT_reactNativeDevServerPort: String(metroPort),
    MOBILE_ANDROID_METRO_PORT: String(metroPort),
  };

  const serial = getTargetDevice(adb);
  if (!serial) {
    throw new Error(
      mode === "device"
        ? "No connected physical Android device was detected."
        : "No running Android emulator was detected."
    );
  }

  const metroAlreadyRunning = await isPortBusy(metroPort);
  if (forceFreshMetro) {
    console.log(`[android] --clear detected. Starting a fresh Metro server instead of reusing existing ports.`);
    const startedMetro = await startMetroOnAvailablePort(env, metroPort + (metroAlreadyRunning ? 1 : 0));
    metroPort = startedMetro.metroPort;
    Object.assign(env, startedMetro.env);
  } else if (metroAlreadyRunning) {
    const compatibleMetro = await isMetroCompatible(metroPort);
    if (compatibleMetro) {
      console.log(`[android] Port ${metroPort} is already in use. Reusing the existing Metro server.`);
    } else {
      console.warn(
        `[android] Port ${DEFAULT_METRO_PORT} is in use by an incompatible Metro server. Selecting a healthy dedicated Metro port.`
      );

      const startedMetro = await startMetroOnAvailablePort(env, metroPort + 1);
      metroPort = startedMetro.metroPort;
      Object.assign(env, startedMetro.env);
    }
  } else {
    const startedMetro = await startMetroOnAvailablePort(env, metroPort);
    metroPort = startedMetro.metroPort;
    Object.assign(env, startedMetro.env);
  }

  cleanAndroidBuildArtifacts();

  console.log(`[android] Building debug APK for ${serial}.`);
  const apkPath = buildApp(env, metroPort);

  console.log(`[android] Removing existing ${APP_ID} from ${serial} before install.`);
  uninstallExistingApp(adb, serial);

  reverseMetroPorts(adb, serial, metroPort);

  console.log(`[android] Installing ${path.basename(apkPath)} on ${serial}.`);
  installApp(adb, serial, apkPath);

  console.log(`[android] Launching ${APP_ID} on ${serial}.`);
  launchApp(adb, serial);

}

main().catch((error) => {
  console.error(`[android] ${error.message}`);
  process.exit(1);
});