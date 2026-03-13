import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  models, users, profiles, liveStreams, homepageSections,
  recommendationConfigs,
  modelCallStats, followers,
} from "@missu/db/schema";
import { eq, and, desc, sql, isNotNull, or, ilike, asc } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { DEFAULTS } from "@missu/config";

@Injectable()
export class DiscoveryService {
  async searchModels(query: string, filters: Record<string, any>, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;

    const conditions: any[] = [isNotNull(models.approvedAt)];

    if (query) {
      conditions.push(
        or(
          ilike(users.displayName, `%${query}%`),
          ilike(profiles.bio, `%${query}%`),
        ),
      );
    }
    if (filters.gender) conditions.push(eq(users.gender, filters.gender as any));
    if (filters.country) conditions.push(eq(users.country, filters.country));
    if (filters.isOnline) conditions.push(eq(models.isOnline, true));

    const results = await db
      .select({
        modelId: models.id,
        userId: models.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        gender: users.gender,
        country: users.country,
        isOnline: models.isOnline,
        qualityScore: models.qualityScore,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .innerJoin(profiles, eq(profiles.userId, models.userId))
      .where(and(...conditions))
      .orderBy(desc(models.qualityScore))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return {
      items,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async getHomeFeed(userId: string) {
    const sections = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.status, "ACTIVE"))
      .orderBy(asc(homepageSections.position));

    const feedSections: any[] = [];

    for (const section of sections) {
      let data: any = null;

      switch (section.sectionType) {
        case "LIVE_CAROUSEL":
          data = await this.getTrendingStreams(6);
          break;
        case "FEATURED_MODELS":
          data = await this.getTopModels(10);
          break;
        case "RECOMMENDED_STREAMS":
          data = await this.getModelRecommendations(userId, 10);
          break;
        case "TRENDING_CREATORS":
          data = await this.getOnlineModels(undefined, 10);
          break;
        default:
          data = [];
      }

      feedSections.push({
        id: section.id,
        type: section.sectionType,
        data,
      });
    }

    return feedSections;
  }

  async getTrendingStreams(limit = 20) {
    return db
      .select({
        streamId: liveStreams.id,
        roomId: liveStreams.roomId,
        hostUserId: liveStreams.hostUserId,
        title: liveStreams.streamTitle,
        viewerCount: liveStreams.viewerCountCurrent,
        trendingScore: liveStreams.trendingScore,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(liveStreams)
      .innerJoin(users, eq(users.id, liveStreams.hostUserId))
      .where(eq(liveStreams.status, "LIVE"))
      .orderBy(desc(liveStreams.trendingScore))
      .limit(limit);
  }

  async getModelRecommendations(userId: string, limit = 20) {
    const config = await db.select().from(recommendationConfigs).where(eq(recommendationConfigs.status, "active")).limit(1);
    const weights = config[0]?.weightsJson ?? DEFAULTS.RECOMMENDATION_WEIGHTS;

    const candidates = await db
      .select({
        modelId: models.id,
        userId: models.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        qualityScore: models.qualityScore,
        audioMinutesTotal: modelCallStats.audioMinutesTotal,
        videoMinutesTotal: modelCallStats.videoMinutesTotal,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .leftJoin(modelCallStats, eq(modelCallStats.modelUserId, models.userId))
      .where(and(isNotNull(models.approvedAt), eq(models.isOnline, true)))
      .limit(100);

    const scored = candidates.map((c) => ({
      ...c,
      score: Number(c.qualityScore ?? 0) + (c.audioMinutesTotal ?? 0) + (c.videoMinutesTotal ?? 0),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async getOnlineModels(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;

    const results = await db
      .select({
        modelId: models.id,
        userId: models.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        qualityScore: models.qualityScore,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .where(and(isNotNull(models.approvedAt), eq(models.isOnline, true)))
      .orderBy(desc(models.qualityScore))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return { items, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async getModelCard(modelId: string) {
    const [model] = await db
      .select({
        modelId: models.id,
        userId: models.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: profiles.bio,
        gender: users.gender,
        country: users.country,
        qualityScore: models.qualityScore,
        isOnline: models.isOnline,
        audioMinutesTotal: modelCallStats.audioMinutesTotal,
        videoMinutesTotal: modelCallStats.videoMinutesTotal,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .innerJoin(profiles, eq(profiles.userId, models.userId))
      .leftJoin(modelCallStats, eq(modelCallStats.modelUserId, models.userId))
      .where(eq(models.id, modelId))
      .limit(1);

    if (!model) throw new Error("Model not found");

    const followerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(followers)
      .where(eq(followers.followedUserId, model.userId));

    return {
      ...model,
      followerCount: Number(followerCount[0]?.count ?? 0),
    };
  }

  private async getTopModels(limit: number) {
    return db
      .select({
        modelId: models.id,
        userId: models.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        qualityScore: models.qualityScore,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .where(isNotNull(models.approvedAt))
      .orderBy(desc(models.qualityScore))
      .limit(limit);
  }
}
