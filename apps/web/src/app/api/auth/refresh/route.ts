import { getRequestCookies, getAuthCookieNames } from "@missu/auth";
import { AuthenticationError } from "@missu/utils";
import { authService } from "@/server/services/auth-service";
import { jsonError, jsonSuccess, applyAuthCookies } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { enforceRateLimit } from "@/server/lib/guards";

export async function POST(request: Request) {
  const context = getRequestContext(request);

  try {
    await enforceRateLimit(`refresh:${context.ipAddress}`, 30, 60);
    const refreshToken = getRequestCookies(request).get(getAuthCookieNames().refresh);
    if (!refreshToken) {
      throw new AuthenticationError("Missing refresh token");
    }

    const result = await authService.refresh(refreshToken, context);
    const response = jsonSuccess({ user: result.user }, context);
    applyAuthCookies(response, result.auth);
    return response;
  } catch (error) {
    return jsonError(error, context);
  }
}