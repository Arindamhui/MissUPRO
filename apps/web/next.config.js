/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@missu/types"],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
