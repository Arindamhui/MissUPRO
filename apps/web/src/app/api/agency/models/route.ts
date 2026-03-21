import { authenticateRequest } from "@missu/auth";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { jsonError, jsonSuccess } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { paginationQuerySchema } from "@/server/validators/admin";
import { agencyService } from "@/server/services/agency-service";

export async function GET(request: Request) {
  const context = getRequestContext(request);

  try {
    const claims = await authenticateRequest(request);
    const query = paginationQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const offset = query.cursor ? decodeCursor(query.cursor) : 0;
    const items = await agencyService.listModels({ userId: claims.sub, publicId: claims.publicId ?? null, email: claims.email, role: claims.role, sessionId: claims.sid, agencyId: claims.agencyId ?? null }, query.limit + 1, offset);
    const nextCursor = items.length > query.limit ? encodeCursor(offset + query.limit) : null;
    return jsonSuccess({ items: items.slice(0, query.limit), nextCursor }, context);
  } catch (error) {
    return jsonError(error, context);
  }
}