import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { db } from "@missu/db";
import { idempotencyKeys } from "@missu/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { createHash } from "node:crypto";

type ExecuteParams = {
  key: string;
  operationScope: string;
  actorUserId: string;
  requestData: unknown;
  ttlSeconds?: number;
};

@Injectable()
export class IdempotencyService {
  private normalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalize(item));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .reduce<Record<string, unknown>>((acc, [key, current]) => {
          acc[key] = this.normalize(current);
          return acc;
        }, {});
    }

    return value;
  }

  createRequestHash(requestData: unknown) {
    return createHash("sha256")
      .update(JSON.stringify(this.normalize(requestData)))
      .digest("hex");
  }

  private async getActiveRecord(key: string) {
    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.idempotencyKey, key), gt(idempotencyKeys.expiresAt, new Date())))
      .limit(1);

    return existing ?? null;
  }

  private ensureCompatibleRequest(existingHash: string, requestHash: string) {
    if (existingHash !== requestHash) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Idempotency key reused with different request payload",
      });
    }
  }

  async execute<T>(params: ExecuteParams, operation: () => Promise<T>): Promise<T> {
    const requestHash = this.createRequestHash(params.requestData);
    const ttlSeconds = params.ttlSeconds ?? 24 * 60 * 60;

    const existing = await this.getActiveRecord(params.key);
    if (existing) {
      this.ensureCompatibleRequest(existing.requestHash, requestHash);

      if (existing.status === "COMPLETED" && existing.responseSnapshotJson !== null) {
        return existing.responseSnapshotJson as T;
      }

      if (existing.status === "IN_PROGRESS") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An identical operation is already in progress",
        });
      }
    }

    const [record] = await db
      .insert(idempotencyKeys)
      .values({
        idempotencyKey: params.key,
        operationScope: params.operationScope,
        actorUserId: params.actorUserId,
        requestHash,
        status: "IN_PROGRESS" as any,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      })
      .onConflictDoNothing()
      .returning();

    const activeRecord = record ?? (await this.getActiveRecord(params.key));
    if (!activeRecord) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to persist idempotency state" });
    }

    if (!record) {
      this.ensureCompatibleRequest(activeRecord.requestHash, requestHash);

      if (activeRecord.status === "COMPLETED" && activeRecord.responseSnapshotJson !== null) {
        return activeRecord.responseSnapshotJson as T;
      }

      throw new TRPCError({
        code: "CONFLICT",
        message: "An identical operation has already been submitted",
      });
    }

    try {
      const result = await operation();

      await db
        .update(idempotencyKeys)
        .set({
          status: "COMPLETED" as any,
          responseSnapshotJson: result as any,
        })
        .where(eq(idempotencyKeys.id, activeRecord.id));

      return result;
    } catch (error) {
      await db
        .update(idempotencyKeys)
        .set({
          status: "FAILED" as any,
          responseSnapshotJson: {
            message: error instanceof Error ? error.message : "Unknown idempotent operation failure",
          },
        })
        .where(eq(idempotencyKeys.id, activeRecord.id));

      throw error;
    }
  }
}