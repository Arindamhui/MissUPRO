import { assertCsrf, requireRole } from "@missu/auth";
import { adminService } from "@/server/services/admin-service";
import { jsonError, jsonSuccess, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { updateAdminHostSchema } from "@/server/validators/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request);

  try {
    const claims = await requireRole(request, ["ADMIN"]);
    await assertCsrf(request, claims);
    const input = updateAdminHostSchema.parse(await readJson(request));
    const { id } = await params;
    const result = await adminService.updateHost({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, sessionId: claims.sid, agencyId: claims.agencyId ?? null }, id, input, context);
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}