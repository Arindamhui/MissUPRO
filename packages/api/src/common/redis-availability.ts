import { connect as netConnect } from "node:net";

export async function canReachRedis(redisUrl?: string) {
  if (!redisUrl) {
    return false;
  }

  try {
    const parsed = new URL(redisUrl);
    const host = parsed.hostname;
    const port = Number(parsed.port || 6379);
    const isLocalHost = host === "127.0.0.1" || host === "localhost";

    if (process.env["NODE_ENV"] === "production" || !isLocalHost) {
      return true;
    }

    return await new Promise<boolean>((resolve) => {
      const socket = netConnect({ host, port });
      let settled = false;

      const finish = (available: boolean) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.destroy();
        resolve(available);
      };

      socket.once("connect", () => finish(true));
      socket.once("error", () => finish(false));
      socket.setTimeout(400, () => finish(false));
    });
  } catch {
    return true;
  }
}