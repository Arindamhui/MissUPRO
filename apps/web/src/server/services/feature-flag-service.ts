import { db, featureFlags } from "@missu/db";
import { and, eq } from "drizzle-orm";
import { withCache } from "@missu/cache";
import { hashUserId } from "@missu/utils";

type Platform = "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS";

interface FlagEvalContext {
  userId: string;
  platform?: Platform;
  appVersion?: string;
  region?: string;
}

interface FlagResult {
  enabled: boolean;
  source: "disabled" | "boolean" | "percentage" | "user_list" | "region" | "not_found";
}

async function loadFlags(): Promise<Array<typeof featureFlags.$inferSelect>> {
  return withCache("feature_flags:all", 60, async () => {
    return db.select().from(featureFlags).where(eq(featureFlags.enabled, true));
  });
}

function matchesPlatform(flagPlatform: string, requestPlatform: Platform | undefined): boolean {
  if (flagPlatform === "ALL") return true;
  if (!requestPlatform) return true;
  return flagPlatform === requestPlatform;
}

export async function evaluateFlag(flagKey: string, context: FlagEvalContext): Promise<FlagResult> {
  const flags = await loadFlags();
  const flag = flags.find(
    (f) =>
      f.flagKey === flagKey &&
      matchesPlatform(f.platform, context.platform) &&
      (!f.appVersion || f.appVersion === context.appVersion),
  );

  if (!flag) {
    return { enabled: false, source: "not_found" };
  }

  if (!flag.enabled) {
    return { enabled: false, source: "disabled" };
  }

  switch (flag.flagType) {
    case "BOOLEAN":
      return { enabled: true, source: "boolean" };

    case "PERCENTAGE": {
      const bucket = hashUserId(context.userId, flagKey);
      return { enabled: bucket < (flag.percentageValue ?? 0), source: "percentage" };
    }

    case "USER_LIST": {
      const userIds = (flag.userIdsJson as string[] | null) ?? [];
      return { enabled: userIds.includes(context.userId), source: "user_list" };
    }

    case "REGION": {
      const regionCodes = (flag.regionCodesJson as string[] | null) ?? [];
      return { enabled: regionCodes.includes(context.region ?? ""), source: "region" };
    }

    default:
      return { enabled: false, source: "not_found" };
  }
}

export async function evaluateFlags(
  flagKeys: string[],
  context: FlagEvalContext,
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const key of flagKeys) {
    const result = await evaluateFlag(key, context);
    results[key] = result.enabled;
  }
  return results;
}
