import { checkRateLimit } from "@missu/cache";
import { RateLimitError } from "@missu/utils";

export async function enforceRateLimit(identifier: string, maxRequests: number, windowSeconds: number) {
  const result = await checkRateLimit(identifier, maxRequests, windowSeconds);

  if (!result.allowed) {
    throw new RateLimitError(`Retry after ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds`);
  }
}