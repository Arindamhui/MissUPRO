export function getWebRuntimeScope() {
  return {
    platform: "WEB" as const,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "web-dev",
  };
}