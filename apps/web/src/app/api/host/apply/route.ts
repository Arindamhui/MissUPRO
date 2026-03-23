import { assertCsrf, authenticateRequest } from "@missu/auth";
import { withIdempotency } from "@/server/lib/idempotency";
import { hostService } from "@/server/services/host-service";
import { jsonError, jsonSuccess, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { applyHostSchema } from "@/server/validators/host";

export async function POST(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    await assertCsrf(request, claims);
    const input = applyHostSchema.parse(await readJson(request));
    const result = await withIdempotency({
      key: context.idempotencyKey,
      actorUserId: claims.sub,
      scope: "host.apply",
      payload: input,
      execute: () => hostService.apply({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, platformRole: claims.platformRole, agencyStatus: claims.agencyStatus, sessionId: claims.sid, agencyId: claims.agencyId ?? null }, input, context),
    });
    return jsonSuccess(result, context, { status: 201 });
  } catch (error) {
    return jsonError(error, context);
  }
}