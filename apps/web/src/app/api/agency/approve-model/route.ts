import { assertCsrf, authenticateRequest } from "@missu/auth";
import { withIdempotency } from "@/server/lib/idempotency";
import { jsonError, jsonSuccess, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { agencyApproveModelSchema } from "@/server/validators/agency";
import { agencyService } from "@/server/services/agency-service";

export async function POST(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    await assertCsrf(request, claims);
    const input = agencyApproveModelSchema.parse(await readJson(request));
    const result = await withIdempotency({
      key: context.idempotencyKey,
      actorUserId: claims.sub,
      scope: "agency.approve-model",
      payload: input,
      execute: () => agencyService.approveModel({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, sessionId: claims.sid, agencyId: claims.agencyId ?? null }, input, context),
    });
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}