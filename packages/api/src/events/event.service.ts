import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  events, eventParticipants, leaderboards, leaderboardEntries,
  leaderboardSnapshots, hostAnalyticsSnapshots, users,
} from "@missu/db/schema";
import { eq, and, desc, asc, sql, count, gte, lte } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class EventService {
  // ─── Events CRUD ───
  async listEvents(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions: any[] = [];
    if (status) conditions.push(eq(events.status, status as any));

    const results = await db
      .select()
      .from(events)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(events.startAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async createEvent(data: { title: string; description: string; eventType: string; startDate: Date; endDate: Date; rulesJson?: any; rewardPoolJson?: any }, createdByAdminId: string) {
    const [event] = await db
      .insert(events)
      .values({
        title: data.title,
        description: data.description,
        eventType: data.eventType as any,
        startAt: data.startDate,
        endAt: data.endDate,
        rulesJson: data.rulesJson,
        rewardPoolJson: data.rewardPoolJson,
        createdByAdminId,
        status: "UPCOMING" as any,
      } as any)
      .returning();
    return event;
  }

  async updateEvent(eventId: string, data: Record<string, any>) {
    const [updated] = await db.update(events).set(data).where(eq(events.id, eventId)).returning();
    return updated;
  }

  async getEventDetail(eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("Event not found");

    const participantCount = await db.select({ count: count() }).from(eventParticipants).where(eq(eventParticipants.eventId, eventId));

    return { event, participantCount: Number(participantCount[0]?.count ?? 0) };
  }

  // ─── Event Participants ───
  async joinEvent(userId: string, eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("Event not found");

    const existing = await db.select().from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId))).limit(1);
    if (existing[0]) throw new Error("Already joined");

    const [participant] = await db.insert(eventParticipants).values({ eventId, userId, score: "0" }).returning();
    return participant;
  }

  async updateParticipantScore(eventId: string, userId: string, scoreDelta: number) {
    const [participant] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
      .limit(1);

    if (!participant) throw new Error("Not a participant");

    const newScore = (participant.score ?? 0) + scoreDelta;
    const [updated] = await db
      .update(eventParticipants)
      .set({ score: String(newScore), updatedAt: new Date() })
      .where(eq(eventParticipants.id, participant.id))
      .returning();

    return updated;
  }

  async getEventLeaderboard(eventId: string, limit = 50) {
    return db
      .select({
        userId: eventParticipants.userId,
        score: eventParticipants.score,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(eventParticipants)
      .innerJoin(users, eq(users.id, eventParticipants.userId))
      .where(eq(eventParticipants.eventId, eventId))
      .orderBy(desc(eventParticipants.score))
      .limit(limit);
  }

  // ─── Leaderboards ───
  async getLeaderboard(leaderboardId: string, cursor?: string, limit = 50) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db
      .select({
        userId: leaderboardEntries.userId,
        score: leaderboardEntries.scoreValue,
        rank: leaderboardEntries.rankPosition,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(leaderboardEntries)
      .innerJoin(users, eq(users.id, leaderboardEntries.userId))
      .where(eq(leaderboardEntries.leaderboardId, leaderboardId))
      .orderBy(asc(leaderboardEntries.rankPosition))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async listLeaderboards() {
    return db.select().from(leaderboards).orderBy(desc(leaderboards.createdAt));
  }

  async createLeaderboard(data: { title: string; leaderboardType: string; scoringMetric: string; windowType: string }) {
    const [leaderboard] = await db.insert(leaderboards).values({ ...data, status: "ACTIVE" as any } as any).returning();
    return leaderboard;
  }
}
