import { createHash } from "node:crypto";
import { db, idempotencyKeys } from "@missu/db";
import { and, eq, gt } from "drizzle-orm";
import { ConflictError } from "@missu/utils";

export async function withIdempotency<T>(params: {
  key: string | null;
  actorUserId: string;
  scope: string;
  payload: unknown;
  execute: () => Promise<T>;
}) {
  if (!params.key) {
    return params.execute();
  }

  const requestHash = createHash("sha256").update(JSON.stringify(params.payload)).digest("hex");

  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.idempotencyKey, params.key), gt(idempotencyKeys.expiresAt, new Date())))
    .limit(1);

  const current = existing[0];

  if (current?.requestHash && current.requestHash !== requestHash) {
    throw new ConflictError("Idempotency key reuse with different payload");
  }

  if (current?.status === "COMPLETED" && current.responseSnapshotJson) {
    return current.responseSnapshotJson as T;
  }

  if (!current) {
    await db.insert(idempotencyKeys).values({
      idempotencyKey: params.key,
      operationScope: params.scope,
      actorUserId: params.actorUserId,
      requestHash,
      status: "IN_PROGRESS",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  const result = await params.execute();

  await db
    .update(idempotencyKeys)
    .set({
      responseSnapshotJson: result as Record<string, unknown>,
      status: "COMPLETED",
    })
    .where(eq(idempotencyKeys.idempotencyKey, params.key));

  return result;
}