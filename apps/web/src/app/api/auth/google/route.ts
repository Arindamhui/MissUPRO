import { authService } from "@/server/services/auth-service";
import { jsonError, applyAuthCookies, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { googleLoginSchema } from "@/server/validators/auth";
import { enforceRateLimit } from "@/server/lib/guards";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const context = getRequestContext(request);

  try {
    await enforceRateLimit(`google:${context.ipAddress}`, 20, 60);
    const input = googleLoginSchema.parse(await readJson(request));
    const result = await authService.google(input, context);

    if (!result.user) {
      throw new Error("Unable to resolve user profile");
    }

    const response = NextResponse.json({
      token: result.auth.accessToken,
      sessionId: result.auth.sessionId,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        platformRole: result.platformRole ?? null,
        agencyStatus: result.agencyStatus ?? "NONE",
        authProvider: result.rawAuthProvider ?? "GOOGLE",
      },
    });
    applyAuthCookies(response, result.auth);
    return response;
  } catch (error) {
    return jsonError(error, context);
  }
}