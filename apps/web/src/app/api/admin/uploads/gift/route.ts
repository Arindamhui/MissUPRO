import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchPortalSession } from "@/lib/auth-api";
import { WEB_AUTH_COOKIE_NAME } from "@/lib/web-auth";
import { storageService } from "@/server/services/storage-service";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(WEB_AUTH_COOKIE_NAME)?.value
    ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return badRequest("Unauthorized", 401);
  }

  const session = await fetchPortalSession(token, "login").catch(() => null);

  if (!session || session.status !== "admin") {
    return badRequest("Forbidden", 403);
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    return badRequest("File is required");
  }

  if (!fileEntry.type.startsWith("image/")) {
    return badRequest("Only image uploads are allowed");
  }

  if (fileEntry.size > 5 * 1024 * 1024) {
    return badRequest("Image exceeds 5MB limit");
  }

  const bytes = new Uint8Array(await fileEntry.arrayBuffer());
  const uploaded = await storageService.uploadGiftAsset(session.userId, {
    fileName: fileEntry.name,
    contentType: fileEntry.type,
    bytes,
  });

  return NextResponse.json({ ok: true, data: uploaded }, { status: 201 });
}
