import { requireRole } from "@missu/auth";
import { adminService } from "@/server/services/admin-service";
import { jsonError, jsonSuccess } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";

export async function GET(request: Request) {
  const context = getRequestContext(request);

  try {
    await requireRole(request, ["ADMIN"]);
    const result = await adminService.dashboard();
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}