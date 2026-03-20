const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const projectDir = __dirname;
const workspaceRoot = path.resolve(projectDir, "../..");

// Load the project-local .env.local first, then the monorepo root .env as fallback.
loadEnvConfig(projectDir);
loadEnvConfig(workspaceRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@missu/types"],
  serverExternalPackages: [],
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "",
  },
};

module.exports = nextConfig;
