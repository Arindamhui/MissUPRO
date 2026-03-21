import { assertCsrf, authenticateRequest } from "@missu/auth";
import { jsonError, jsonSuccess, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { updateAgencyModelSchema } from "@/server/validators/agency";
import { agencyService } from "@/server/services/agency-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    await assertCsrf(request, claims);
    const input = updateAgencyModelSchema.parse(await readJson(request));
    const { id } = await params;
    const result = await agencyService.updateModel({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, sessionId: claims.sid, agencyId: claims.agencyId ?? null }, id, input, context);
    return jsonSuccess(result, context);
  } catch (error) {
    return jsonError(error, context);
  }
}