import { assertCsrf, requireRole } from "@missu/auth";
import { withIdempotency } from "@/server/lib/idempotency";
import { adminService } from "@/server/services/admin-service";
import { jsonError, jsonSuccess, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { adminApproveAgencySchema } from "@/server/validators/agency";

export async function POST(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await requireRole(request, ["ADMIN"]);
    await assertCsrf(request, claims);
    const input = adminApproveAgencySchema.parse(await readJson(request));
    const result = await withIdempotency({
      key: context.idempotencyKey,
      actorUserId: claims.sub,
      scope: "admin.approve-agency",
      payload: input,
      execute: () => adminService.approveAgency({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, sessionId: claims.sid, agencyId: claims.agencyId ?? null }, input, context),
    });
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}