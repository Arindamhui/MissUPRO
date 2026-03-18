import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  models, users, profiles, liveStreams, homepageSections,
  recommendationConfigs,
  modelCallStats, followers, modelReviews,
} from "@missu/db/schema";
import { eq, and, desc, sql, isNotNull, or, ilike, asc } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { DEFAULTS } from "@missu/config";

@Injectable()
export class DiscoveryService {
  private discoverySchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  private async getDiscoverySchemaMode() {
    if (!this.discoverySchemaModePromise) {
      this.discoverySchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'models'
        ) as has_models
      `).then(async (result) => {
        const hasModels = Boolean((result.rows[0] as { has_models?: boolean | string | number } | undefined)?.has_models);
        if (!hasModels) {
          return "legacy" as const;
        }

        const userCheck = await db.execute(sql`
          select exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'users'
              and column_name = 'display_name'
          ) as has_display_name
        `);
        const hasDisplayName = Boolean((userCheck.rows[0] as { has_display_name?: boolean | string | number } | undefined)?.has_display_name);
        return hasDisplayName ? "modern" : "legacy";
      });
    }

    return this.discoverySchemaModePromise;
  }

  private async listLegacyProfiles(limit: number, offset: number, query?: string) {
    return db.execute(sql`
      select
        u.id as "userId",
        u.id as "modelId",
        coalesce(p.display_name, u.username) as "displayName",
        p.avatar_url as "avatarUrl",
        null::text as gender,
        p.country,
        false as "isOnline",
        0::numeric as "qualityScore",
        p.bio,
        0::int as "audioPrice",
        0::int as "videoPrice",
        0::int as "demoVideoCount"
      from users u
      left join profiles p on p.user_id = u.id
      where (${query ? sql`coalesce(p.display_name, u.username) ilike ${`%${query}%`} or coalesce(p.bio, '') ilike ${`%${query}%`}` : sql`true`})
      order by u.created_at desc
      limit ${limit}
      offset ${offset}
    `);
  }

  async searchModels(query: string, filters: Record<string, any>, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;

    if (await this.getDiscoverySchemaMode() === "legacy") {
      if (filters.isOnline) {
        return { items: [], nextCursor: null };
      }

      const results = await db.execute(sql`
        select
          u.id as "userId",
          u.id as "modelId",
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl",
          null::text as gender,
          p.country,
          false as "isOnline",
          0::numeric as "qualityScore"
        from users u
        left join profiles p on p.user_id = u.id
        where (${query ? sql`coalesce(p.display_name, u.username) ilike ${`%${query}%`} or coalesce(p.bio, '') ilike ${`%${query}%`}` : sql`true`})
          ${filters.country ? sql`and p.country = ${filters.country}` : sql``}
        order by u.created_at desc
        limit ${limit + 1}
        offset ${offset}
      `);

      const rows = results.rows as Array<Record<string, unknown>>;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      return { items, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
    }

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
    if (await this.getDiscoverySchemaMode() === "legacy") {
      const results = await db.execute(sql`
        select
          ls.id as "streamId",
          lr.id as "roomId",
          ls.host_user_id as "hostUserId",
          coalesce(lr.title, 'Live Room') as title,
          coalesce(lr.title, 'Live Room') as "roomName",
          'Live'::text as category,
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl",
          coalesce(lr.viewer_count, 0) as "viewerCount",
          coalesce(ls.peak_viewers, 0) as "peakViewers",
          coalesce(ls.total_gift_coins, 0) as "giftRevenueCoins",
          ls.created_at as "startedAt",
          coalesce(ls.trending_score, 0) as "trendingScore"
        from live_streams ls
        inner join live_rooms lr on lr.id = ls.live_room_id
        inner join users u on u.id = ls.host_user_id
        left join profiles p on p.user_id = u.id
        where ls.ended_at is null and lr.status = 'LIVE'
        order by coalesce(ls.trending_score, 0) desc, ls.created_at desc
        limit ${limit}
      `);

      return results.rows;
    }

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
    if (await this.getDiscoverySchemaMode() === "legacy") {
      const results = await db.execute(sql`
        select
          u.id as "modelId",
          u.id as "userId",
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl",
          0::numeric as "qualityScore",
          0::int as "audioMinutesTotal",
          0::int as "videoMinutesTotal"
        from users u
        left join profiles p on p.user_id = u.id
        where u.id <> ${userId}::uuid
        order by u.created_at desc
        limit ${limit}
      `);

      return results.rows;
    }

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
    if (await this.getDiscoverySchemaMode() === "legacy") {
      return { items: [], nextCursor: null };
    }

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
    if (await this.getDiscoverySchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          u.id as "modelId",
          u.id as "userId",
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl",
          p.bio,
          null::text as gender,
          p.country,
          0::numeric as "qualityScore",
          false as "isOnline",
          0::int as "audioPrice",
          0::int as "videoPrice",
          0::int as "demoVideoCount",
          0::int as "audioMinutesTotal",
          0::int as "videoMinutesTotal"
        from users u
        left join profiles p on p.user_id = u.id
        where u.id = ${modelId}::uuid
        limit 1
      `);

      const model = result.rows[0] as Record<string, unknown> | undefined;
      if (!model) throw new Error("Model not found");

      const followerCount = await db.execute(sql`
        select count(*)::int as count
        from followers
        where following_user_id = ${modelId}::uuid
      `);

      return {
        ...model,
        followerCount: Number((followerCount.rows[0] as { count?: number } | undefined)?.count ?? 0),
        avgRating: 0,
        reviewCount: 0,
      };
    }

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
        audioPrice: models.callRateAudioCoins,
        videoPrice: models.callRateVideoCoins,
        demoVideoCount: models.demoVideoCount,
        audioMinutesTotal: modelCallStats.audioMinutesTotal,
        videoMinutesTotal: modelCallStats.videoMinutesTotal,
      })
      .from(models)
      .innerJoin(users, eq(users.id, models.userId))
      .innerJoin(profiles, eq(profiles.userId, models.userId))
      .leftJoin(modelCallStats, eq(modelCallStats.modelUserId, models.userId))
      .where(or(eq(models.id, modelId), eq(models.userId, modelId)))
      .limit(1);

    if (!model) throw new Error("Model not found");

    const followerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(followers)
      .where(eq(followers.followedUserId, model.userId));

    const [ratingSummary] = await db
      .select({
        avgRating: sql<number>`coalesce(avg(${modelReviews.rating}), 0)`,
        reviewCount: sql<number>`count(*)`,
      })
      .from(modelReviews)
      .where(and(eq(modelReviews.modelUserId, model.userId), eq(modelReviews.isVisible, true)));

    return {
      ...model,
      followerCount: Number(followerCount[0]?.count ?? 0),
      avgRating: Number(ratingSummary?.avgRating ?? 0),
      reviewCount: Number(ratingSummary?.reviewCount ?? 0),
    };
  }

  private async getTopModels(limit: number) {
    if (await this.getDiscoverySchemaMode() === "legacy") {
      const results = await db.execute(sql`
        select
          u.id as "modelId",
          u.id as "userId",
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl",
          0::numeric as "qualityScore"
        from users u
        left join profiles p on p.user_id = u.id
        order by u.created_at desc
        limit ${limit}
      `);

      return results.rows;
    }

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
