import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { liveRooms, liveStreams, liveViewers, pkSessions, pkScores } from "@missu/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculateTrendingScore } from "@missu/utils";

@Injectable()
export class LiveService {
  async createRoom(hostUserId: string, roomName: string, category: string, roomType = "PUBLIC") {
    const [room] = await db.insert(liveRooms).values({
      hostUserId,
      roomName,
      category,
      roomType: roomType as any,
      status: "LIVE",
    }).returning();
    return room!;
  }

  async startStream(roomId: string, hostUserId: string, title: string, streamType: string) {
    const rtcChannelId = `live_${crypto.randomUUID()}`;
    const [stream] = await db.insert(liveStreams).values({
      roomId,
      hostUserId,
      streamTitle: title,
      streamType: streamType as any,
      status: "LIVE",
      rtcChannelId,
      startedAt: new Date(),
    }).returning();
    return stream!;
  }

  async endStream(streamId: string, reason?: string) {
    const endedAt = new Date();
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
    if (!stream) throw new TRPCError({ code: "NOT_FOUND" });

    const durationSeconds = stream.startedAt
      ? Math.floor((endedAt.getTime() - stream.startedAt.getTime()) / 1000)
      : 0;

    await db.update(liveStreams).set({
      status: "ENDED",
      endReason: (reason ?? "NORMAL") as any,
      endedAt,
      durationSeconds,
    }).where(eq(liveStreams.id, streamId));

    return { streamId, durationSeconds };
  }

  async joinStream(streamId: string, userId: string) {
    const [viewer] = await db.insert(liveViewers).values({
      streamId,
      userId,
    }).returning();

    await db.update(liveStreams).set({
      viewerCountCurrent: sql`${liveStreams.viewerCountCurrent} + 1`,
      viewerCountPeak: sql`GREATEST(${liveStreams.viewerCountPeak}, ${liveStreams.viewerCountCurrent} + 1)`,
    }).where(eq(liveStreams.id, streamId));

    return viewer!;
  }

  async leaveStream(streamId: string, userId: string) {
    await db.update(liveViewers).set({
      leftAt: new Date(),
    }).where(
      and(eq(liveViewers.streamId, streamId), eq(liveViewers.userId, userId)),
    );

    await db.update(liveStreams).set({
      viewerCountCurrent: sql`GREATEST(${liveStreams.viewerCountCurrent} - 1, 0)`,
    }).where(eq(liveStreams.id, streamId));
  }

  async updateTrendingScores() {
    const streams = await db.select().from(liveStreams)
      .where(eq(liveStreams.status, "LIVE"));

    for (const stream of streams) {
      const score = calculateTrendingScore(
        Number(stream.giftRevenueCoins ?? 0),
        stream.viewerCountPeak ?? 0,
        stream.viewerCountCurrent ?? 0,
      );
      await db.update(liveStreams).set({ trendingScore: String(score) })
        .where(eq(liveStreams.id, stream.id));
    }
  }

  // ─── PK Battles ───
  async requestPKBattle(hostAId: string, hostBId: string) {
    const [pk] = await db.insert(pkSessions).values({
      hostAUserId: hostAId,
      hostBUserId: hostBId,
      status: "CREATED",
      battleDurationSeconds: 300,
    }).returning();
    return pk!;
  }

  async acceptPKBattle(pkSessionId: string, hostBId: string) {
    await db.update(pkSessions).set({
      status: "ACTIVE",
      startedAt: new Date(),
    }).where(and(eq(pkSessions.id, pkSessionId), eq(pkSessions.hostBUserId, hostBId)));
    return { success: true };
  }

  async getPKBattleState(pkSessionId: string) {
    const [pk] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    const scores = await db.select().from(pkScores).where(eq(pkScores.pkSessionId, pkSessionId));
    return { session: pk, scores };
  }
}
