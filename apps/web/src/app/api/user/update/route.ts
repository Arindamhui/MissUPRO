import { assertCsrf, authenticateRequest } from "@missu/auth";
import { userService } from "@/server/services/user-service";
import { jsonError, jsonSuccess, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { updateUserSchema } from "@/server/validators/auth";

export async function PATCH(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    await assertCsrf(request, claims);
    const input = updateUserSchema.parse(await readJson(request));
    const result = await userService.update(claims.sub, input);
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}