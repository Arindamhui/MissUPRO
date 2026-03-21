import { authenticateRequest } from "@missu/auth";
import { authService } from "@/server/services/auth-service";
import { clearAuthCookies, jsonError, jsonSuccess } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";

export async function POST(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request).catch(() => null);
    await authService.logout(claims?.sid ?? null);
    const response = jsonSuccess({ loggedOut: true }, context);
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return jsonError(error, context);
  }
}