import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  withdrawRequests,
  payoutRecords,
  modelCallStats,
} from "@missu/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

@Injectable()
export class PayoutsService {
  async listWithdrawRequests(status?: string, limit = 50) {
    const rows = await db
      .select()
      .from(withdrawRequests)
      .where(status ? eq(withdrawRequests.status, status as any) : undefined)
      .orderBy(desc(withdrawRequests.createdAt))
      .limit(limit);

    return { items: rows };
  }

  async getModelMinuteSummary(modelUserId: string) {
    const [stats] = await db
      .select()
      .from(modelCallStats)
      .where(eq(modelCallStats.modelUserId, modelUserId))
      .limit(1);

    return stats ?? null;
  }

  async calculateModelPayout(modelUserId: string, audioRateUsd: number, videoRateUsd: number) {
    const [stats] = await db
      .select()
      .from(modelCallStats)
      .where(eq(modelCallStats.modelUserId, modelUserId))
      .limit(1);

    if (!stats) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Model call stats not found" });
    }

    const audioMinutes = stats.audioMinutesPending ?? 0;
    const videoMinutes = stats.videoMinutesPending ?? 0;
    const audioEarnings = audioMinutes * audioRateUsd;
    const videoEarnings = videoMinutes * videoRateUsd;
    const total = Number((audioEarnings + videoEarnings).toFixed(2));

    return {
      modelUserId,
      audioMinutes,
      videoMinutes,
      audioRateUsd,
      videoRateUsd,
      audioEarnings: Number(audioEarnings.toFixed(2)),
      videoEarnings: Number(videoEarnings.toFixed(2)),
      total,
      currency: "USD",
    };
  }

  async approveMinutePayout(
    withdrawRequestId: string,
    adminId: string,
    audioRateUsd: number,
    videoRateUsd: number,
  ) {
    const [request] = await db
      .select()
      .from(withdrawRequests)
      .where(and(eq(withdrawRequests.id, withdrawRequestId), eq(withdrawRequests.status, "PENDING" as any)))
      .limit(1);

    if (!request) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Pending withdrawal request not found" });
    }

    const [stats] = await db
      .select()
      .from(modelCallStats)
      .where(eq(modelCallStats.modelUserId, request.modelUserId))
      .limit(1);

    if (!stats) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Model call stats not found" });
    }

    const audioMinutesPaid = stats.audioMinutesPending ?? 0;
    const videoMinutesPaid = stats.videoMinutesPending ?? 0;
    const audioEarnings = Number((audioMinutesPaid * audioRateUsd).toFixed(2));
    const videoEarnings = Number((videoMinutesPaid * videoRateUsd).toFixed(2));
    const totalPayoutAmount = Number((audioEarnings + videoEarnings).toFixed(2));

    await db.transaction(async (tx) => {
      await tx.insert(payoutRecords).values({
        modelUserId: request.modelUserId,
        withdrawRequestId: request.id,
        audioMinutesPaid,
        videoMinutesPaid,
        audioRateSnapshot: String(audioRateUsd.toFixed(4)),
        videoRateSnapshot: String(videoRateUsd.toFixed(4)),
        audioEarnings: String(audioEarnings.toFixed(2)),
        videoEarnings: String(videoEarnings.toFixed(2)),
        diamondEarnings: request.diamondEarningsSnapshot,
        totalPayoutAmount: String(totalPayoutAmount.toFixed(2)),
        currency: request.currency,
        payoutMethod: request.payoutMethod,
        status: "COMPLETED" as any,
        approvedByAdminId: adminId,
        processedAt: new Date(),
      } as any);

      await tx
        .update(modelCallStats)
        .set({
          audioMinutesPaid: (stats.audioMinutesPaid ?? 0) + audioMinutesPaid,
          videoMinutesPaid: (stats.videoMinutesPaid ?? 0) + videoMinutesPaid,
          audioMinutesPending: 0,
          videoMinutesPending: 0,
          updatedAt: new Date(),
        })
        .where(eq(modelCallStats.id, stats.id));

      await tx
        .update(withdrawRequests)
        .set({
          status: "COMPLETED" as any,
          approvedByAdminId: adminId,
          approvedAt: new Date(),
          completedAt: new Date(),
          audioMinutesSnapshot: audioMinutesPaid,
          videoMinutesSnapshot: videoMinutesPaid,
          audioRateSnapshot: String(audioRateUsd.toFixed(4)),
          videoRateSnapshot: String(videoRateUsd.toFixed(4)),
          callEarningsSnapshot: String(totalPayoutAmount.toFixed(2)),
          totalPayoutAmount: String(totalPayoutAmount.toFixed(2)),
          updatedAt: new Date(),
        })
        .where(eq(withdrawRequests.id, request.id));
    });

    return {
      withdrawRequestId,
      modelUserId: request.modelUserId,
      audioMinutesPaid,
      videoMinutesPaid,
      totalPayoutAmount,
      currency: request.currency,
      status: "COMPLETED",
    };
  }
}
