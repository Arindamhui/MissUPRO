/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
const workspaceNodeModulesPath = path.resolve(workspaceRoot, "node_modules");

config.watchFolders = [workspaceRoot];

// Exclude build artifacts and non-mobile directories from Metro's file watcher
// to prevent ENOENT crashes (e.g. apps/web/.next/export)
config.resolver.blockList = [
  /apps[\\/]web[\\/]\.next[\\/].*/,
  /apps[\\/]web[\\/]node_modules[\\/].*/,
  /apps[\\/]mobile[\\/]android[\\/].*/,
  /apps[\\/]mobile[\\/]dist[\\/].*/,
  /infra[\\/].*/,
  /services[\\/].*/,
  /tmp[\\/].*/,
  /\.turbo[\\/].*/,
];
config.resolver.nodeModulesPaths = [workspaceNodeModulesPath].filter((nodeModulesPath) => {
  if (!fs.existsSync(nodeModulesPath)) {
    return false;
  }

  return fs.existsSync(path.join(nodeModulesPath, "react"));
});
config.resolver.extraNodeModules = {
  react: path.join(workspaceNodeModulesPath, "react"),
  "react-native": path.join(workspaceNodeModulesPath, "react-native"),
  expo: path.join(workspaceNodeModulesPath, "expo"),
  "expo-router": path.join(workspaceNodeModulesPath, "expo-router"),
};

module.exports = config;