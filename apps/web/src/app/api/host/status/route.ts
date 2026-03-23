import { authenticateRequest } from "@missu/auth";
import { hostService } from "@/server/services/host-service";
import { jsonError, jsonSuccess } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";

export async function GET(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    const result = await hostService.status({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, platformRole: claims.platformRole, agencyStatus: claims.agencyStatus, sessionId: claims.sid, agencyId: claims.agencyId ?? null });
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}