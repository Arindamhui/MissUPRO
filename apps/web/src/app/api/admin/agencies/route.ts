import { requireRole } from "@missu/auth";
import { adminService } from "@/server/services/admin-service";
import { jsonError, jsonSuccess } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { paginationQuerySchema } from "@/server/validators/admin";

export async function GET(request: Request) {
  const context = getRequestContext(request);

  try {
    await requireRole(request, ["ADMIN"]);
    const query = paginationQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await adminService.listAgencies(query.limit, query.cursor);
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}