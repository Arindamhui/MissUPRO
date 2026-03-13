import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  groupAudioRooms, groupAudioParticipants, groupAudioBillingTicks,
  groupAudioHandRaises, users, wallets, coinTransactions,
} from "@missu/db/schema";
import { eq, and, desc, asc, sql, count, ne } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { decodeCursor, encodeCursor, generateIdempotencyKey, acquireLock, releaseLock } from "@missu/utils";

@Injectable()
export class GroupAudioService {
  async createRoom(hostUserId: string, data: { title: string; description?: string; topicTagsJson?: any; maxSpeakers?: number; maxListeners?: number; scheduledStartAt?: Date }) {
    const [room] = await db
      .insert(groupAudioRooms)
      .values({
        hostUserId,
        title: data.title,
        description: data.description,
        topicTagsJson: data.topicTagsJson,
        maxSpeakers: data.maxSpeakers ?? DEFAULTS.GROUP_AUDIO.MAX_SPEAKERS_PER_ROOM,
        maxListeners: data.maxListeners ?? 100,
        status: data.scheduledStartAt ? "SCHEDULED" : "CREATED" as any,
        scheduledStartAt: data.scheduledStartAt,
      } as any)
      .returning();

    if (!room) throw new Error("Failed to create group audio room");

    // Auto-add host as speaker
    await db.insert(groupAudioParticipants).values({
      roomId: room.id,
      userId: hostUserId,
      role: "HOST" as any,
      status: "ACTIVE" as any,
      isMuted: false,
      joinedAt: new Date(),
    });

    return room;
  }

  async startRoom(roomId: string, hostUserId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Room not found or not host");
    if (room.status !== "CREATED" && room.status !== "SCHEDULED") throw new Error("Room cannot be started");

    const [updated] = await db.update(groupAudioRooms).set({ status: "LIVE" as any, startedAt: new Date() }).where(eq(groupAudioRooms.id, roomId)).returning();
    return updated;
  }

  async joinRoom(roomId: string, userId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(eq(groupAudioRooms.id, roomId)).limit(1);
    if (!room) throw new Error("Room not found");
    if (room.status !== "LIVE" && room.status !== "CREATED") throw new Error("Room is not joinable");

    const participantCount = await db.select({ count: count() }).from(groupAudioParticipants).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.status, "ACTIVE" as any)));
    if (Number(participantCount[0]?.count ?? 0) >= ((room.maxSpeakers ?? 0) + (room.maxListeners ?? 0))) {
      throw new Error("Room is full");
    }

    const existing = await db.select().from(groupAudioParticipants).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId))).limit(1);
    if (existing[0]) return existing[0];

    const [participant] = await db
      .insert(groupAudioParticipants)
      .values({ roomId, userId, role: "LISTENER" as any, status: "ACTIVE" as any, isMuted: true, joinedAt: new Date() })
      .returning();

    await db.update(groupAudioRooms).set({ totalParticipantsCount: sql`${groupAudioRooms.totalParticipantsCount} + 1` }).where(eq(groupAudioRooms.id, roomId));
    return participant;
  }

  async leaveRoom(roomId: string, userId: string) {
    await db.update(groupAudioParticipants).set({ status: "LEFT" as any, leftAt: new Date() }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId)));
    return { success: true };
  }

  async endRoom(roomId: string, hostUserId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Room not found or not host");

    const endedAt = new Date();
    const durationSeconds = room.startedAt ? Math.floor((endedAt.getTime() - new Date(room.startedAt).getTime()) / 1000) : 0;

    await db.update(groupAudioRooms).set({ status: "ENDED" as any, endedAt, totalDurationSeconds: durationSeconds }).where(eq(groupAudioRooms.id, roomId));
    await db.update(groupAudioParticipants).set({ status: "LEFT" as any, leftAt: endedAt }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.status, "ACTIVE" as any)));

    return { success: true, durationSeconds };
  }

  async getRoomState(roomId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(eq(groupAudioRooms.id, roomId)).limit(1);
    if (!room) throw new Error("Room not found");

    const participants = await db
      .select({
        userId: groupAudioParticipants.userId,
        role: groupAudioParticipants.role,
        isMuted: groupAudioParticipants.isMuted,
        joinedAt: groupAudioParticipants.joinedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(groupAudioParticipants)
      .innerJoin(users, eq(users.id, groupAudioParticipants.userId))
      .where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.status, "ACTIVE" as any)))
      .orderBy(asc(groupAudioParticipants.joinedAt));

    const handRaises = await db
      .select()
      .from(groupAudioHandRaises)
      .where(and(eq(groupAudioHandRaises.roomId, roomId), eq(groupAudioHandRaises.status, "PENDING" as any)))
      .orderBy(asc(groupAudioHandRaises.createdAt));

    return { room, participants, handRaises };
  }

  async listActiveRooms(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db
      .select({
        id: groupAudioRooms.id,
        title: groupAudioRooms.title,
        description: groupAudioRooms.description,
        hostUserId: groupAudioRooms.hostUserId,
        totalParticipantsCount: groupAudioRooms.totalParticipantsCount,
        maxSpeakers: groupAudioRooms.maxSpeakers,
        maxListeners: groupAudioRooms.maxListeners,
        status: groupAudioRooms.status,
        hostName: users.displayName,
        hostAvatar: users.avatarUrl,
      })
      .from(groupAudioRooms)
      .innerJoin(users, eq(users.id, groupAudioRooms.hostUserId))
      .where(eq(groupAudioRooms.status, "LIVE" as any))
      .orderBy(desc(groupAudioRooms.totalParticipantsCount))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async raiseHand(roomId: string, userId: string) {
    const existing = await db.select().from(groupAudioHandRaises).where(and(eq(groupAudioHandRaises.roomId, roomId), eq(groupAudioHandRaises.userId, userId), eq(groupAudioHandRaises.status, "PENDING" as any))).limit(1);
    if (existing[0]) return existing[0];

    const [raise] = await db.insert(groupAudioHandRaises).values({ roomId, userId, status: "PENDING" as any, requestedAt: new Date() }).returning();
    return raise;
  }

  async resolveHandRaise(roomId: string, hostUserId: string, userId: string, action: "accept" | "reject") {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    await db.update(groupAudioHandRaises).set({ status: action === "accept" ? "ACCEPTED" : "REJECTED" as any, resolvedByUserId: hostUserId, resolvedAt: new Date() }).where(and(eq(groupAudioHandRaises.roomId, roomId), eq(groupAudioHandRaises.userId, userId)));

    if (action === "accept") {
      await db.update(groupAudioParticipants).set({ role: "SPEAKER" as any, isMuted: false }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId)));
    }

    return { success: true };
  }

  async promoteToSpeaker(roomId: string, hostUserId: string, userId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    await db.update(groupAudioParticipants).set({ role: "SPEAKER" as any, isMuted: false }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId)));
    return { success: true };
  }

  async demoteToListener(roomId: string, hostUserId: string, userId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    await db.update(groupAudioParticipants).set({ role: "LISTENER" as any, isMuted: true }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId)));
    return { success: true };
  }

  async muteParticipant(roomId: string, hostUserId: string, userId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    await db.update(groupAudioParticipants).set({ isMuted: true }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId)));
    return { success: true };
  }

  async removeParticipant(roomId: string, hostUserId: string, userId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    await db.update(groupAudioParticipants).set({ status: "LEFT" as any, leftAt: new Date() }).where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.userId, userId)));
    return { success: true };
  }

  async updateTopic(roomId: string, hostUserId: string, topicTagsJson: any) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    const [updated] = await db.update(groupAudioRooms).set({ topicTagsJson }).where(eq(groupAudioRooms.id, roomId)).returning();
    return updated;
  }

  async processBillingTick(roomId: string) {
    const [room] = await db.select().from(groupAudioRooms).where(and(eq(groupAudioRooms.id, roomId), eq(groupAudioRooms.status, "LIVE" as any))).limit(1);
    if (!room) return;

    const speakers = await db
      .select()
      .from(groupAudioParticipants)
      .where(and(eq(groupAudioParticipants.roomId, roomId), eq(groupAudioParticipants.role, "SPEAKER" as any), eq(groupAudioParticipants.status, "ACTIVE" as any)));

    const costPerMinute = DEFAULTS.GROUP_AUDIO.COST_PER_MINUTE_PER_SPEAKER;

    for (const speaker of speakers) {
      const lock = await acquireLock(`wallet:${speaker.userId}`, 5000);
      if (!lock) continue;

      try {
        const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, speaker.userId)).limit(1);
        if (!wallet || wallet.coinBalance < costPerMinute) continue;

        const newBalance = wallet.coinBalance - costPerMinute;
        await db.update(wallets).set({ coinBalance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id));
        await db.insert(coinTransactions).values({
          userId: speaker.userId,
          amount: -costPerMinute,
          transactionType: "GROUP_AUDIO" as any,
          description: `Group audio billing - room ${roomId}`,
          balanceAfter: newBalance,
          idempotencyKey: generateIdempotencyKey(speaker.userId, "ga_billing", `${roomId}_${Date.now()}`),
        });
        await db.insert(groupAudioBillingTicks).values({
          roomId,
          participantId: speaker.id,
          userId: speaker.userId,
          tickNumber: 0,
          coinsDeducted: costPerMinute,
          userBalanceAfter: newBalance,
          tickTimestamp: new Date(),
        } as any);
      } finally {
        await releaseLock(`wallet:${speaker.userId}`, lock);
      }
    }
  }

  async getBillingState(roomId: string, userId: string) {
    const ticks = await db
      .select()
      .from(groupAudioBillingTicks)
      .where(and(eq(groupAudioBillingTicks.roomId, roomId), eq(groupAudioBillingTicks.userId, userId)))
      .orderBy(desc(groupAudioBillingTicks.createdAt));

    const totalBilled = ticks.reduce((sum, t) => sum + (t.coinsDeducted ?? 0), 0);
    return { ticks, totalBilled };
  }
}
