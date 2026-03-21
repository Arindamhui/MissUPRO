import { QueryFunctionContext } from "@tanstack/react-query";

async function parseBody<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | { error?: { message?: string }; message?: string } | null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error && typeof payload.error.message === "string" ? payload.error.message : undefined)
      ?? (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" ? payload.message : undefined)
      ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export async function adminFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  return parseBody<T>(response);
}

export function adminQuery<T>(url: string) {
  return async (_context: QueryFunctionContext) => adminFetch<T>(url);
}

export async function uploadGiftAsset(file: File, token?: string | null) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/uploads/gift", {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  return parseBody<{ objectKey: string; url: string; contentType: string; fileName: string }>(response);
}
