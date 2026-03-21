import { authenticateRequest } from "@missu/auth";
import { userService } from "@/server/services/user-service";
import { jsonError, jsonSuccess } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";

export async function GET(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    const result = await userService.getMe(claims.sub);
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}