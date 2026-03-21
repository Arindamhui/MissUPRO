const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const projectDir = __dirname;
const workspaceRoot = path.resolve(projectDir, "../..");

// Load the project-local .env.local first, then the monorepo root .env as fallback.
loadEnvConfig(projectDir);
loadEnvConfig(workspaceRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@missu/auth", "@missu/cache", "@missu/config", "@missu/db", "@missu/logger", "@missu/queue", "@missu/types", "@missu/utils"],
  serverExternalPackages: [],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  },
};

module.exports = nextConfig;
