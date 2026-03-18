import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { liveRooms, liveStreams, liveViewers, chatMessages, users, followers, giftTransactions } from "@missu/db/schema";
import { eq, and, desc, sql, isNull, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculateTrendingScore } from "@missu/utils";
import { ConfigService } from "../config/config.service";
import { GiftService } from "../gifts/gift.service";
import { RtcTokenService } from "./rtc-token.service";
import { PkService } from "../pk/pk.service";
import { WalletService } from "../wallet/wallet.service";
import { LevelService } from "../levels/level.service";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class LiveService {
  private liveSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly giftService: GiftService,
    private readonly rtcTokenService: RtcTokenService,
    private readonly pkService: PkService,
    private readonly walletService: WalletService,
    private readonly levelService: LevelService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getLiveSchemaMode() {
    if (!this.liveSchemaModePromise) {
      this.liveSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'live_streams'
            and column_name = 'room_id'
        ) as has_modern_live_streams
      `).then((result) => {
        const value = result.rows[0] as { has_modern_live_streams?: boolean | string | number } | undefined;
        return value?.has_modern_live_streams ? "modern" : "legacy";
      });
    }

    return this.liveSchemaModePromise;
  }

  private async getLegacyHostProfile(hostUserId: string) {
    const result = await db.execute(sql`
      select
        coalesce(p.display_name, u.username) as "displayName",
        u.username,
        p.avatar_url as "avatarUrl"
      from users u
      left join profiles p on p.user_id = u.id
      where u.id = ${hostUserId}::uuid
      limit 1
    `);

    return (result.rows[0] as { displayName?: string | null; username?: string | null; avatarUrl?: string | null } | undefined) ?? null;
  }

  private mapLegacyStreamCard(row: Record<string, unknown>) {
    return this.mapStreamCard({
      streamId: String(row.streamId ?? ""),
      roomId: String(row.roomId ?? ""),
      hostUserId: String(row.hostUserId ?? ""),
      title: String(row.title ?? row.roomName ?? "Live Room"),
      roomName: String(row.roomName ?? row.title ?? "Live Room"),
      category: String(row.category ?? "Live"),
      hostDisplayName: row.hostDisplayName as string | null,
      hostUsername: row.hostUsername as string | null,
      avatarUrl: row.avatarUrl as string | null,
      viewerCount: row.viewerCount as number | string | null,
      peakViewers: row.peakViewers as number | string | null,
      giftRevenueCoins: row.giftRevenueCoins as number | string | null,
      startedAt: row.startedAt instanceof Date ? row.startedAt : row.startedAt ? new Date(String(row.startedAt)) : null,
      trendingScore: row.trendingScore as number | string | null,
    });
  }

  private async getLegacyStreamRow(streamId: string) {
    const result = await db.execute(sql`
      select
        ls.id as "streamId",
        lr.id as "roomId",
        ls.host_user_id as "hostUserId",
        coalesce(lr.title, 'Live Room') as title,
        coalesce(lr.title, 'Live Room') as "roomName",
        'Live'::text as category,
        coalesce(p.display_name, u.username) as "hostDisplayName",
        u.username as "hostUsername",
        p.avatar_url as "avatarUrl",
        coalesce(lr.viewer_count, 0) as "viewerCount",
        coalesce(ls.peak_viewers, 0) as "peakViewers",
        coalesce(ls.total_gift_coins, 0) as "giftRevenueCoins",
        ls.started_at as "startedAt",
        coalesce(ls.trending_score, 0) as "trendingScore",
        ls.rtc_channel_name as "rtcChannelName"
      from live_streams ls
      inner join live_rooms lr on lr.id = ls.live_room_id
      inner join users u on u.id = ls.host_user_id
      left join profiles p on p.user_id = u.id
      where ls.id = ${streamId}::uuid
      limit 1
    `);

    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  private async getLegacyChatSessionId(roomId: string) {
    const existing = await db.execute(sql`
      select id
      from chat_sessions
      where live_room_id = ${roomId}::uuid
      limit 1
    `);

    if (existing.rows[0]?.id) {
      return String(existing.rows[0].id);
    }

    const created = await db.execute(sql`
      insert into chat_sessions (id, live_room_id, created_at)
      values (gen_random_uuid(), ${roomId}::uuid, now())
      returning id
    `);

    return String(created.rows[0]?.id ?? "");
  }

  private async finalizeViewerSession(viewer: { id: string; userId: string; joinedAt: Date; watchDurationSeconds: number | null }, streamId: string, endedAt: Date) {
    const sessionDurationSeconds = viewer.joinedAt
      ? Math.max(0, Math.floor((endedAt.getTime() - new Date(viewer.joinedAt).getTime()) / 1000))
      : 0;
    const totalWatchDurationSeconds = Math.max(0, Number(viewer.watchDurationSeconds ?? 0) + sessionDurationSeconds);

    await db.update(liveViewers).set({
      leftAt: endedAt,
      watchDurationSeconds: totalWatchDurationSeconds,
    }).where(eq(liveViewers.id, viewer.id));

    await this.levelService.awardWatchXp(viewer.userId, totalWatchDurationSeconds, viewer.id, streamId);
    return totalWatchDurationSeconds;
  }

  private resolveFeatureFlagState(
    featureFlags: Array<{ flagKey: string; enabled: boolean }>,
    keys: string[],
    fallback = true,
  ) {
    const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
    const matches = featureFlags.filter((flag) => normalizedKeys.has(flag.flagKey.toLowerCase()));

    if (matches.length === 0) {
      return fallback;
    }

    return matches.some((flag) => Boolean(flag.enabled));
  }

  private getRuntimeScope(scope?: { platform?: "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS"; appVersion?: string }) {
    return {
      platform: scope?.platform,
      appVersion: scope?.appVersion,
    };
  }

  private mapStreamCard(row: {
    streamId: string;
    roomId: string;
    hostUserId: string;
    title: string;
    roomName: string;
    category: string;
    hostDisplayName: string | null;
    hostUsername: string | null;
    avatarUrl: string | null;
    viewerCount: number | string | null;
    peakViewers: number | string | null;
    giftRevenueCoins: number | string | null;
    startedAt: Date | null;
    trendingScore: number | string | null;
  }) {
    return {
      ...row,
      viewerCount: Number(row.viewerCount ?? 0),
      peakViewers: Number(row.peakViewers ?? 0),
      giftRevenueCoins: Number(row.giftRevenueCoins ?? 0),
      trendingScore: Number(row.trendingScore ?? 0),
      hostName: row.hostDisplayName ?? row.hostUsername ?? "Host",
      hostAvatar: row.avatarUrl,
      startedAt: row.startedAt?.toISOString() ?? null,
    };
  }

  async getDiscoveryFeed(input: {
    category?: string;
    sort: "trending" | "viewers" | "newest";
    limit: number;
  }) {
    const baseConditions = [eq(liveStreams.status, "LIVE")];
    const filteredConditions = input.category
      ? [...baseConditions, eq(liveRooms.category, input.category)]
      : baseConditions;

    const orderBy = input.sort === "newest"
      ? [desc(liveStreams.startedAt), desc(liveStreams.createdAt)]
      : input.sort === "viewers"
        ? [desc(liveStreams.viewerCountCurrent), desc(liveStreams.startedAt)]
        : [desc(liveStreams.trendingScore), desc(liveStreams.viewerCountCurrent), desc(liveStreams.startedAt)];

    const [summaryRows, categoryRows, streamRows] = await Promise.all([
      db
        .select({
          liveStreams: sql<number>`count(*)`,
          activeViewers: sql<number>`coalesce(sum(${liveStreams.viewerCountCurrent}), 0)`,
          liveHosts: sql<number>`count(distinct ${liveStreams.hostUserId})`,
        })
        .from(liveStreams)
        .where(and(...baseConditions)),
      db
        .select({
          category: liveRooms.category,
          count: sql<number>`count(*)`,
        })
        .from(liveStreams)
        .innerJoin(liveRooms, eq(liveRooms.id, liveStreams.roomId))
        .where(and(...baseConditions))
        .groupBy(liveRooms.category)
        .orderBy(desc(sql`count(*)`), asc(liveRooms.category)),
      db
        .select({
          streamId: liveStreams.id,
          roomId: liveRooms.id,
          hostUserId: users.id,
          title: sql<string>`coalesce(${liveStreams.streamTitle}, ${liveRooms.roomName})`,
          roomName: liveRooms.roomName,
          category: liveRooms.category,
          hostDisplayName: users.displayName,
          hostUsername: users.username,
          avatarUrl: users.avatarUrl,
          viewerCount: liveStreams.viewerCountCurrent,
          peakViewers: liveStreams.viewerCountPeak,
          giftRevenueCoins: liveStreams.giftRevenueCoins,
          startedAt: liveStreams.startedAt,
          trendingScore: liveStreams.trendingScore,
        })
        .from(liveStreams)
        .innerJoin(liveRooms, eq(liveRooms.id, liveStreams.roomId))
        .innerJoin(users, eq(users.id, liveStreams.hostUserId))
        .where(and(...filteredConditions))
        .orderBy(...orderBy)
        .limit(input.limit),
    ]);

    const liveNow = streamRows.map((row) => this.mapStreamCard(row));

    return {
      summary: {
        liveStreams: Number(summaryRows[0]?.liveStreams ?? 0),
        activeViewers: Number(summaryRows[0]?.activeViewers ?? 0),
        liveHosts: Number(summaryRows[0]?.liveHosts ?? 0),
      },
      categories: categoryRows.map((row) => ({
        category: row.category,
        count: Number(row.count ?? 0),
      })),
      spotlight: liveNow.slice(0, 3),
      liveNow,
    };
  }

  async getStreamPreview(streamId: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const stream = await this.getLegacyStreamRow(streamId);
      if (!stream) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
      }

      const [followerCountRows, recentChat] = await Promise.all([
        db.execute(sql`
          select count(*)::int as count
          from followers
          where following_user_id = ${String(stream.hostUserId)}::uuid
        `),
        this.getRecentChatMessages(streamId, 12),
      ]);

      const normalized = this.mapLegacyStreamCard(stream);
      return {
        stream: {
          ...normalized,
          followerCount: Number((followerCountRows.rows[0] as { count?: number } | undefined)?.count ?? 0),
        },
        recentChat,
        relatedStreams: [],
      };
    }

    const [stream] = await db
      .select({
        streamId: liveStreams.id,
        roomId: liveRooms.id,
        hostUserId: users.id,
        title: sql<string>`coalesce(${liveStreams.streamTitle}, ${liveRooms.roomName})`,
        roomName: liveRooms.roomName,
        category: liveRooms.category,
        hostDisplayName: users.displayName,
        hostUsername: users.username,
        avatarUrl: users.avatarUrl,
        viewerCount: liveStreams.viewerCountCurrent,
        peakViewers: liveStreams.viewerCountPeak,
        giftRevenueCoins: liveStreams.giftRevenueCoins,
        trendingScore: liveStreams.trendingScore,
        startedAt: liveStreams.startedAt,
      })
      .from(liveStreams)
      .innerJoin(liveRooms, eq(liveRooms.id, liveStreams.roomId))
      .innerJoin(users, eq(users.id, liveStreams.hostUserId))
      .where(and(eq(liveStreams.id, streamId), eq(liveStreams.status, "LIVE")))
      .limit(1);

    if (!stream) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
    }

    const [followerCountRows, recentChat, relatedRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(followers)
        .where(eq(followers.followedUserId, stream.hostUserId)),
      this.getRecentChatMessages(stream.streamId, 12),
      db
        .select({
          streamId: liveStreams.id,
          roomId: liveRooms.id,
          hostUserId: users.id,
          title: sql<string>`coalesce(${liveStreams.streamTitle}, ${liveRooms.roomName})`,
          roomName: liveRooms.roomName,
          category: liveRooms.category,
          hostDisplayName: users.displayName,
          hostUsername: users.username,
          avatarUrl: users.avatarUrl,
          viewerCount: liveStreams.viewerCountCurrent,
          peakViewers: liveStreams.viewerCountPeak,
          giftRevenueCoins: liveStreams.giftRevenueCoins,
          startedAt: liveStreams.startedAt,
          trendingScore: liveStreams.trendingScore,
        })
        .from(liveStreams)
        .innerJoin(liveRooms, eq(liveRooms.id, liveStreams.roomId))
        .innerJoin(users, eq(users.id, liveStreams.hostUserId))
        .where(
          and(
            eq(liveStreams.status, "LIVE"),
            eq(liveRooms.category, stream.category),
            sql`${liveStreams.id} <> ${stream.streamId}`,
          ),
        )
        .orderBy(desc(liveStreams.viewerCountCurrent), desc(liveStreams.startedAt))
        .limit(4),
    ]);

    return {
      stream: {
        ...stream,
        viewerCount: Number(stream.viewerCount ?? 0),
        peakViewers: Number(stream.peakViewers ?? 0),
        giftRevenueCoins: Number(stream.giftRevenueCoins ?? 0),
        trendingScore: Number(stream.trendingScore ?? 0),
        followerCount: Number(followerCountRows[0]?.count ?? 0),
        startedAt: stream.startedAt?.toISOString() ?? new Date().toISOString(),
      },
      recentChat,
      relatedStreams: relatedRows.map((row) => ({
        ...row,
        viewerCount: Number(row.viewerCount ?? 0),
        peakViewers: Number(row.peakViewers ?? 0),
        giftRevenueCoins: Number(row.giftRevenueCoins ?? 0),
        trendingScore: Number(row.trendingScore ?? 0),
        startedAt: row.startedAt?.toISOString() ?? null,
      })),
    };
  }

  async getViewerRoom(streamId: string, scope?: { platform?: "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS"; appVersion?: string }) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const [preview, bootstrap, activeGifts, coinPackages, activeViewerRows] = await Promise.all([
        this.getStreamPreview(streamId),
        this.configService.getConfigBootstrap(this.getRuntimeScope(scope)),
        this.giftService.getActiveCatalog(),
        this.walletService.getCoinPackages(),
        db.execute(sql`
          select
            lv.user_id as "userId",
            coalesce(p.display_name, u.username) as "displayName",
            u.username,
            p.avatar_url as "avatarUrl",
            lv.joined_at as "joinedAt",
            0::int as "giftCoinsSent",
            0::int as "watchDurationSeconds"
          from live_viewers lv
          inner join users u on u.id = lv.user_id
          left join profiles p on p.user_id = u.id
          where lv.live_stream_id = ${streamId}::uuid and lv.left_at is null
          order by lv.joined_at asc
          limit 24
        `),
      ]);

      const rawFeatureFlags = bootstrap.featureFlags.map((flag) => ({
        flagKey: flag.flagKey,
        enabled: Boolean(flag.enabled),
      }));

      return {
        stream: preview.stream,
        recentChat: preview.recentChat,
        relatedStreams: preview.relatedStreams,
        topSupporters: [],
        activeViewers: (activeViewerRows.rows as Array<Record<string, unknown>>).map((viewer) => ({
          userId: viewer.userId,
          displayName: viewer.displayName,
          username: viewer.username,
          avatarUrl: viewer.avatarUrl,
          joinedAt: viewer.joinedAt ? new Date(String(viewer.joinedAt)).toISOString() : null,
          giftCoinsSent: 0,
          watchDurationSeconds: 0,
        })),
        monetization: {
          gifts: activeGifts.map((gift) => ({
            id: gift.id,
            displayName: gift.displayName,
            catalogKey: gift.catalogKey,
            coinPrice: Number(gift.coinPrice ?? 0),
            diamondCredit: Number(gift.diamondCredit ?? 0),
          })),
          coinPackages: coinPackages.map((coinPackage) => ({
            id: coinPackage.id,
            title: coinPackage.name,
            coins: Number(coinPackage.coins ?? 0),
            bonusCoins: Number(coinPackage.bonusCoins ?? 0),
            price: Number(coinPackage.price ?? 0),
            priceDisplay: coinPackage.priceDisplay,
            currency: coinPackage.currency,
          })),
        },
        liveConfig: {
          generatedAt: bootstrap.generatedAt,
          featureFlags: bootstrap.featureFlags.map((flag) => ({
            key: flag.flagKey,
            enabled: Boolean(flag.enabled),
            flagType: flag.flagType,
          })),
          pricingHighlights: bootstrap.pricingRules.slice(0, 8).map((rule) => {
            const item = rule as Record<string, unknown>;
            return {
              ruleKey: String(item.ruleKey ?? "rule"),
              price: item.priceUsd ?? item.priceValue ?? item.rateValue ?? null,
              currency: item.currency ?? null,
              billingUnit: item.billingUnit ?? item.unit ?? null,
            };
          }),
          layout: {
            videoContainer: true,
            giftAnimationLayer: true,
            chatOverlay: true,
            viewerList: true,
          },
          uiLayoutHints: {
            chatEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["live_chat", "chat_enabled", "stream_chat"]),
            giftingEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["live_gifting", "gift_sending", "gifts_enabled"]),
            pkEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["pk_battle", "pk_enabled", "live_pk"], false),
            callupsellEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["video_calls", "calls_enabled", "paid_calls"], true),
            withdrawalsEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["withdrawals", "creator_withdrawals"], true),
          },
        },
      };
    }

    const [preview, bootstrap, activeGifts, coinPackages, topSupportersRows, activeViewerRows] = await Promise.all([
      this.getStreamPreview(streamId),
      this.configService.getConfigBootstrap(this.getRuntimeScope(scope)),
      this.giftService.getActiveCatalog(),
      this.walletService.getCoinPackages(),
      db
        .select({
          userId: giftTransactions.senderUserId,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
          totalCoins: sql<number>`SUM(${giftTransactions.coinCost})`,
        })
        .from(giftTransactions)
        .innerJoin(users, eq(users.id, giftTransactions.senderUserId))
        .where(
          and(
            eq(giftTransactions.contextType, "LIVE_STREAM" as any),
            eq(giftTransactions.contextId, streamId),
          ),
        )
        .groupBy(
          giftTransactions.senderUserId,
          users.displayName,
          users.username,
          users.avatarUrl,
        )
        .orderBy(desc(sql`SUM(${giftTransactions.coinCost})`))
        .limit(5),
      db
        .select({
          userId: liveViewers.userId,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
          joinedAt: liveViewers.joinedAt,
          giftCoinsSent: liveViewers.giftCoinsSent,
          watchDurationSeconds: liveViewers.watchDurationSeconds,
        })
        .from(liveViewers)
        .innerJoin(users, eq(users.id, liveViewers.userId))
        .where(and(eq(liveViewers.streamId, streamId), isNull(liveViewers.leftAt)))
        .orderBy(desc(liveViewers.giftCoinsSent), asc(liveViewers.joinedAt))
        .limit(24),
    ]);

    const rawFeatureFlags = bootstrap.featureFlags.map((flag) => ({
      flagKey: flag.flagKey,
      enabled: Boolean(flag.enabled),
    }));

    const featureFlags = bootstrap.featureFlags.map((flag) => ({
      key: flag.flagKey,
      enabled: Boolean(flag.enabled),
      flagType: flag.flagType,
    }));

    const pricingHighlights = bootstrap.pricingRules.slice(0, 8).map((rule) => {
      const item = rule as Record<string, unknown>;

      return {
        ruleKey: String(item.ruleKey ?? "rule"),
        price: item.priceUsd ?? item.priceValue ?? item.rateValue ?? null,
        currency: item.currency ?? null,
        billingUnit: item.billingUnit ?? item.unit ?? null,
      };
    });

    return {
      stream: preview.stream,
      recentChat: preview.recentChat,
      relatedStreams: preview.relatedStreams,
      topSupporters: topSupportersRows.map((supporter) => ({
        userId: supporter.userId,
        displayName: supporter.displayName,
        username: supporter.username,
        avatarUrl: supporter.avatarUrl,
        totalCoins: Number(supporter.totalCoins ?? 0),
      })),
      activeViewers: activeViewerRows.map((viewer) => ({
        userId: viewer.userId,
        displayName: viewer.displayName,
        username: viewer.username,
        avatarUrl: viewer.avatarUrl,
        joinedAt: viewer.joinedAt?.toISOString() ?? null,
        giftCoinsSent: Number(viewer.giftCoinsSent ?? 0),
        watchDurationSeconds: Number(viewer.watchDurationSeconds ?? 0),
      })),
      monetization: {
        gifts: activeGifts.map((gift) => ({
          id: gift.id,
          displayName: gift.displayName,
          catalogKey: gift.catalogKey,
          coinPrice: Number(gift.coinPrice ?? 0),
          diamondCredit: Number(gift.diamondCredit ?? 0),
        })),
        coinPackages: coinPackages.map((coinPackage) => ({
          id: coinPackage.id,
          title: coinPackage.name,
          coins: Number(coinPackage.coins ?? 0),
          bonusCoins: Number(coinPackage.bonusCoins ?? 0),
          price: Number(coinPackage.price ?? 0),
          priceDisplay: coinPackage.priceDisplay,
          currency: coinPackage.currency,
        })),
      },
      liveConfig: {
        generatedAt: bootstrap.generatedAt,
        featureFlags,
        pricingHighlights,
        layout: {
          videoContainer: true,
          giftAnimationLayer: true,
          chatOverlay: true,
          viewerList: true,
        },
        uiLayoutHints: {
          chatEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["live_chat", "chat_enabled", "stream_chat"]),
          giftingEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["live_gifting", "gift_sending", "gifts_enabled"]),
          pkEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["pk_battle", "pk_enabled", "live_pk"], false),
          callupsellEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["video_calls", "calls_enabled", "paid_calls"], true),
          withdrawalsEnabled: this.resolveFeatureFlagState(rawFeatureFlags, ["withdrawals", "creator_withdrawals"], true),
        },
      },
    };
  }

  async createRoom(hostUserId: string, roomName: string, category: string, roomType = "PUBLIC") {
    if (await this.getLiveSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        insert into live_rooms (
          id,
          host_user_id,
          title,
          status,
          max_guests,
          viewer_count,
          created_at
        )
        values (
          gen_random_uuid(),
          ${hostUserId}::uuid,
          ${roomName},
          'WAITING',
          4,
          0,
          now()
        )
        returning id, host_user_id as "hostUserId", title, status, max_guests as "maxGuests", viewer_count as "viewerCount", created_at as "createdAt"
      `);
      return result.rows[0];
    }

    const [room] = await db.insert(liveRooms).values({
      hostUserId,
      roomName,
      category,
      roomType: roomType as any,
      status: "IDLE",
    }).returning();
    return room!;
  }

  async getMyActiveStream(hostUserId: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          ls.id as "streamId",
          lr.id as "roomId",
          ls.host_user_id as "hostUserId",
          coalesce(lr.title, 'Live Room') as title,
          coalesce(lr.title, 'Live Room') as "roomName",
          'Live'::text as category,
          coalesce(p.display_name, u.username) as "hostDisplayName",
          u.username as "hostUsername",
          p.avatar_url as "avatarUrl",
          coalesce(lr.viewer_count, 0) as "viewerCount",
          coalesce(ls.peak_viewers, 0) as "peakViewers",
          coalesce(ls.total_gift_coins, 0) as "giftRevenueCoins",
          ls.started_at as "startedAt",
          coalesce(ls.trending_score, 0) as "trendingScore"
        from live_streams ls
        inner join live_rooms lr on lr.id = ls.live_room_id
        inner join users u on u.id = ls.host_user_id
        left join profiles p on p.user_id = u.id
        where ls.host_user_id = ${hostUserId}::uuid
          and ls.ended_at is null
          and lr.status = 'LIVE'
        order by ls.started_at desc nulls last, ls.created_at desc
        limit 1
      `);

      const stream = result.rows[0] as Record<string, unknown> | undefined;
      return stream ? this.mapLegacyStreamCard(stream) : null;
    }

    const [stream] = await db
      .select({
        streamId: liveStreams.id,
        roomId: liveRooms.id,
        hostUserId: liveStreams.hostUserId,
        title: sql<string>`coalesce(${liveStreams.streamTitle}, ${liveRooms.roomName})`,
        roomName: liveRooms.roomName,
        category: liveRooms.category,
        hostDisplayName: users.displayName,
        hostUsername: users.username,
        avatarUrl: users.avatarUrl,
        viewerCount: liveStreams.viewerCountCurrent,
        peakViewers: liveStreams.viewerCountPeak,
        giftRevenueCoins: liveStreams.giftRevenueCoins,
        startedAt: liveStreams.startedAt,
        trendingScore: liveStreams.trendingScore,
      })
      .from(liveStreams)
      .innerJoin(liveRooms, eq(liveRooms.id, liveStreams.roomId))
      .innerJoin(users, eq(users.id, liveStreams.hostUserId))
      .where(and(eq(liveStreams.hostUserId, hostUserId), eq(liveStreams.status, "LIVE")))
      .orderBy(desc(liveStreams.startedAt), desc(liveStreams.createdAt))
      .limit(1);

    return stream ? this.mapStreamCard(stream) : null;
  }

  async startLiveSession(hostUserId: string, input: { roomName: string; category: string; title: string; roomType?: string; streamType?: string }) {
    const existing = await this.getMyActiveStream(hostUserId);
    if (existing) {
      return existing;
    }

    const existingRoom = await (async () => {
      if (await this.getLiveSchemaMode() === "legacy") {
        const result = await db.execute(sql`
          select id, host_user_id as "hostUserId", title, status, created_at as "createdAt"
          from live_rooms
          where host_user_id = ${hostUserId}::uuid
          order by created_at desc
          limit 1
        `);
        return (result.rows[0] as Record<string, any> | undefined) ?? null;
      }

      const [room] = await db
        .select()
        .from(liveRooms)
        .where(eq(liveRooms.hostUserId, hostUserId))
        .orderBy(desc(liveRooms.updatedAt), desc(liveRooms.createdAt))
        .limit(1);
      return room ?? null;
    })();

    const room = existingRoom ?? await this.createRoom(hostUserId, input.roomName, input.category, input.roomType ?? "PUBLIC");
    if (!room || !("id" in room) || !room.id) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to prepare live room" });
    }

    if (await this.getLiveSchemaMode() === "legacy") {
      await db.execute(sql`
        update live_rooms
        set title = ${input.roomName},
            status = 'LIVE',
            started_at = now(),
            viewer_count = coalesce(viewer_count, 0)
        where id = ${String(room.id)}::uuid
      `);

      const started = await this.startStream(String(room.id), hostUserId, input.title, input.streamType ?? "SOLO") as Record<string, unknown>;
      return this.getViewerRoom(String(started.id ?? started.streamId ?? ""));
    }

    await db.update(liveRooms).set({
      roomName: input.roomName,
      category: input.category,
      roomType: (input.roomType ?? room.roomType ?? "PUBLIC") as any,
      status: "LIVE",
      updatedAt: new Date(),
    }).where(eq(liveRooms.id, room.id));

    const started = await this.startStream(String(room.id), hostUserId, input.title, input.streamType ?? "SOLO") as Record<string, unknown>;
    return this.getViewerRoom(String(started.id ?? started.streamId ?? ""));
  }

  async startStream(roomId: string, hostUserId: string, title: string, streamType: string) {
    const rtcChannelId = `live_${crypto.randomUUID()}`;

    if (await this.getLiveSchemaMode() === "legacy") {
      const tokenPayload = this.rtcTokenService.issueToken(rtcChannelId, 0, "publisher", 3600);
      const result = await db.execute(sql`
        insert into live_streams (
          id,
          live_room_id,
          host_user_id,
          rtc_channel_name,
          rtc_token,
          trending_score,
          total_gift_coins,
          peak_viewers,
          started_at,
          created_at
        )
        values (
          gen_random_uuid(),
          ${roomId}::uuid,
          ${hostUserId}::uuid,
          ${rtcChannelId},
          ${tokenPayload.token},
          0,
          0,
          0,
          now(),
          now()
        )
        returning id, live_room_id as "liveRoomId", host_user_id as "hostUserId", rtc_channel_name as "rtcChannelId"
      `);

      const host = await this.getLegacyHostProfile(hostUserId);
      const followerRows = await db.execute(sql`
        select follower_user_id as "followerUserId"
        from followers
        where following_user_id = ${hostUserId}::uuid
      `);

      const hostName = host?.displayName ?? host?.username ?? "Someone";
      const started = result.rows[0] as Record<string, unknown> | undefined;

      if (started) {
        await Promise.allSettled(
          (followerRows.rows as Array<{ followerUserId?: string }>).map((follower) => this.notificationService.createNotification(
            String(follower.followerUserId ?? ""),
            "LIVE_STARTED",
            `${hostName} is live`,
            title?.trim() ? title : `${hostName} just started a live stream.`,
            {
              hostUserId,
              roomId,
              streamId: started.id,
              deepLink: `/stream/${started.id}`,
              channels: ["PUSH"],
            },
          )),
        );
      }

      return {
        ...(started ?? {}),
        agoraToken: tokenPayload.token,
        agoraAppId: tokenPayload.appId,
        expiresAt: tokenPayload.expiresAt,
      };
    }

    const [stream] = await db.insert(liveStreams).values({
      roomId,
      hostUserId,
      streamTitle: title,
      streamType: streamType as any,
      status: "LIVE",
      rtcChannelId,
      startedAt: new Date(),
    }).returning();

    await db.update(liveRooms).set({
      status: "LIVE",
      totalSessions: sql`${liveRooms.totalSessions} + 1`,
      updatedAt: new Date(),
    }).where(eq(liveRooms.id, roomId));

    const [host, followerRows] = await Promise.all([
      db
        .select({
          displayName: users.displayName,
          username: users.username,
        })
        .from(users)
        .where(eq(users.id, hostUserId))
        .limit(1),
      db
        .select({ followerUserId: followers.followerUserId })
        .from(followers)
        .where(eq(followers.followedUserId, hostUserId)),
    ]);

    const hostName = host[0]?.displayName ?? host[0]?.username ?? "Someone";
    await Promise.allSettled(
      followerRows.map((follower) => this.notificationService.createNotification(
        follower.followerUserId,
        "LIVE_STARTED",
        `${hostName} is live`,
        title?.trim() ? title : `${hostName} just started a live stream.`,
        {
          hostUserId,
          roomId,
          streamId: stream!.id,
          deepLink: `/stream/${stream!.id}`,
          channels: ["PUSH"],
        },
      )),
    );

    const tokenPayload = this.rtcTokenService.issueToken(rtcChannelId, 0, "publisher", 3600);

    return {
      ...stream!,
      agoraToken: tokenPayload.token,
      agoraAppId: tokenPayload.appId,
      expiresAt: tokenPayload.expiresAt,
    };
  }

  async getActiveStreams(limit = 50) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          ls.id as "streamId",
          lr.id as "roomId",
          ls.host_user_id as "hostUserId",
          coalesce(lr.title, 'Live Room') as title,
          coalesce(lr.title, 'Live Room') as "roomName",
          'Live'::text as category,
          coalesce(p.display_name, u.username) as "hostDisplayName",
          u.username as "hostUsername",
          p.avatar_url as "avatarUrl",
          coalesce(lr.viewer_count, 0) as "viewerCount",
          coalesce(ls.peak_viewers, 0) as "peakViewers",
          coalesce(ls.total_gift_coins, 0) as "giftRevenueCoins",
          ls.started_at as "startedAt",
          coalesce(ls.trending_score, 0) as "trendingScore"
        from live_streams ls
        inner join live_rooms lr on lr.id = ls.live_room_id
        inner join users u on u.id = ls.host_user_id
        left join profiles p on p.user_id = u.id
        where ls.ended_at is null and lr.status = 'LIVE'
        order by coalesce(ls.trending_score, 0) desc, ls.started_at desc nulls last
        limit ${limit}
      `);

      return { streams: (result.rows as Array<Record<string, unknown>>).map((stream) => this.mapLegacyStreamCard(stream)) };
    }

    const streams = await db
      .select({
        streamId: liveStreams.id,
        roomId: liveRooms.id,
        hostUserId: liveStreams.hostUserId,
        title: sql<string>`coalesce(${liveStreams.streamTitle}, ${liveRooms.roomName})`,
        roomName: liveRooms.roomName,
        category: liveRooms.category,
        hostDisplayName: users.displayName,
        hostUsername: users.username,
        avatarUrl: users.avatarUrl,
        viewerCount: liveStreams.viewerCountCurrent,
        peakViewers: liveStreams.viewerCountPeak,
        giftRevenueCoins: liveStreams.giftRevenueCoins,
        startedAt: liveStreams.startedAt,
        trendingScore: liveStreams.trendingScore,
      })
      .from(liveStreams)
      .innerJoin(liveRooms, eq(liveRooms.id, liveStreams.roomId))
      .innerJoin(users, eq(users.id, liveStreams.hostUserId))
      .where(eq(liveStreams.status, "LIVE"))
      .orderBy(desc(liveStreams.trendingScore), desc(liveStreams.startedAt))
      .limit(limit);

    return { streams: streams.map((stream) => this.mapStreamCard(stream)) };
  }

  async issueViewerToken(streamId: string, userId: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const stream = await this.getLegacyStreamRow(streamId);
      const channel = String(stream?.rtcChannelName ?? "");

      if (!stream || !channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not live" });
      }

      const tokenPayload = this.rtcTokenService.issueToken(channel, 0, "subscriber", 1800);
      return {
        streamId,
        channel,
        agoraToken: tokenPayload.token,
        agoraAppId: tokenPayload.appId,
        expiresAt: tokenPayload.expiresAt,
      };
    }

    const [stream] = await db.select().from(liveStreams)
      .where(eq(liveStreams.id, streamId))
      .limit(1);

    if (!stream || stream.status !== "LIVE") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Stream not live" });
    }

    const tokenPayload = this.rtcTokenService.issueToken(stream.rtcChannelId, 0, "subscriber", 1800);

    return {
      streamId,
      channel: stream.rtcChannelId,
      agoraToken: tokenPayload.token,
      agoraAppId: tokenPayload.appId,
      expiresAt: tokenPayload.expiresAt,
    };
  }

  async issueHostToken(streamId: string, hostUserId: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const stream = await this.getLegacyStreamRow(streamId);
      const channel = String(stream?.rtcChannelName ?? "");

      if (!stream || !channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not live" });
      }

      if (String(stream.hostUserId ?? "") !== hostUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the host can publish to this stream" });
      }

      const tokenPayload = this.rtcTokenService.issueToken(channel, 0, "publisher", 1800);
      return {
        streamId,
        channel,
        agoraToken: tokenPayload.token,
        agoraAppId: tokenPayload.appId,
        expiresAt: tokenPayload.expiresAt,
      };
    }

    const [stream] = await db.select().from(liveStreams)
      .where(eq(liveStreams.id, streamId))
      .limit(1);

    if (!stream || stream.status !== "LIVE") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Stream not live" });
    }

    if (stream.hostUserId !== hostUserId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only the host can publish to this stream" });
    }

    const tokenPayload = this.rtcTokenService.issueToken(stream.rtcChannelId, 0, "publisher", 1800);

    return {
      streamId,
      channel: stream.rtcChannelId,
      agoraToken: tokenPayload.token,
      agoraAppId: tokenPayload.appId,
      expiresAt: tokenPayload.expiresAt,
    };
  }

  async endStream(streamId: string, reason?: string) {
    const endedAt = new Date();

    if (await this.getLiveSchemaMode() === "legacy") {
      const stream = await this.getLegacyStreamRow(streamId);
      if (!stream) throw new TRPCError({ code: "NOT_FOUND" });

      const startedAt = stream.startedAt ? new Date(String(stream.startedAt)) : null;
      const durationSeconds = startedAt
        ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
        : 0;

      await db.execute(sql`
        update live_streams
        set ended_at = ${endedAt}
        where id = ${streamId}::uuid
      `);
      await db.execute(sql`
        update live_rooms
        set status = 'ENDED', ended_at = ${endedAt}, viewer_count = 0
        where id = ${String(stream.roomId ?? "")}::uuid
      `);
      await db.execute(sql`
        update live_viewers
        set left_at = ${endedAt}
        where live_stream_id = ${streamId}::uuid and left_at is null
      `);

      return { streamId, durationSeconds };
    }

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
      viewerCountCurrent: 0,
    }).where(eq(liveStreams.id, streamId));

    await db.update(liveRooms).set({
      status: "IDLE",
      updatedAt: endedAt,
    }).where(eq(liveRooms.id, stream.roomId));

    const activeViewers = await db.select().from(liveViewers)
      .where(and(eq(liveViewers.streamId, streamId), isNull(liveViewers.leftAt)));

    let totalWatchMinutesAwarded = 0;
    for (const viewer of activeViewers) {
      const totalSeconds = await this.finalizeViewerSession(viewer, streamId, endedAt);
      totalWatchMinutesAwarded += Math.floor(totalSeconds / 60);
    }

    if (totalWatchMinutesAwarded > 0) {
      await db.update(liveRooms).set({
        totalWatchMinutes: sql`${liveRooms.totalWatchMinutes} + ${totalWatchMinutesAwarded}`,
        updatedAt: endedAt,
      }).where(eq(liveRooms.id, stream.roomId));
    }

    await this.levelService.awardStreamingXp(stream.hostUserId, durationSeconds, streamId);

    return { streamId, durationSeconds };
  }

  async joinStream(streamId: string, userId: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const existingViewerResult = await db.execute(sql`
        select id, joined_at as "joinedAt"
        from live_viewers
        where live_stream_id = ${streamId}::uuid and user_id = ${userId}::uuid and left_at is null
        limit 1
      `);
      if (existingViewerResult.rows[0]) {
        return existingViewerResult.rows[0];
      }

      const [viewer] = await db.execute(sql`
        insert into live_viewers (id, live_stream_id, user_id, joined_at, created_at)
        values (gen_random_uuid(), ${streamId}::uuid, ${userId}::uuid, now(), now())
        returning id, live_stream_id as "streamId", user_id as "userId", joined_at as "joinedAt"
      `).then((result) => result.rows as Array<Record<string, unknown>>);

      const stream = await this.getLegacyStreamRow(streamId);
      if (stream?.roomId) {
        await db.execute(sql`
          update live_rooms
          set viewer_count = greatest(coalesce(viewer_count, 0) + 1, 0)
          where id = ${String(stream.roomId)}::uuid
        `);
      }
      await db.execute(sql`
        update live_streams
        set peak_viewers = greatest(coalesce(peak_viewers, 0), coalesce((select viewer_count from live_rooms where id = ${String(stream?.roomId ?? "00000000-0000-0000-0000-000000000000")}::uuid), 0)),
            trending_score = ${String(calculateTrendingScore(Number(stream?.giftRevenueCoins ?? 0), Number(stream?.peakViewers ?? 0), Number(stream?.viewerCount ?? 0) + 1))}
        where id = ${streamId}::uuid
      `);

      return viewer;
    }

    const [existingViewer] = await db.select().from(liveViewers)
      .where(and(eq(liveViewers.streamId, streamId), eq(liveViewers.userId, userId), isNull(liveViewers.leftAt)))
      .limit(1);

    if (existingViewer) {
      return existingViewer;
    }

    const [viewer] = await db.insert(liveViewers).values({
      streamId,
      userId,
    }).returning();

    await db.update(liveStreams).set({
      viewerCountCurrent: sql`${liveStreams.viewerCountCurrent} + 1`,
      viewerCountPeak: sql`GREATEST(${liveStreams.viewerCountPeak}, ${liveStreams.viewerCountCurrent} + 1)`,
    }).where(eq(liveStreams.id, streamId));

    const [updatedStream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
    if (updatedStream) {
      const nextTrendingScore = calculateTrendingScore(
        Number(updatedStream.giftRevenueCoins ?? 0),
        Number(updatedStream.viewerCountPeak ?? 0),
        Number(updatedStream.viewerCountCurrent ?? 0),
      );
      await db.update(liveStreams).set({ trendingScore: String(nextTrendingScore) }).where(eq(liveStreams.id, streamId));
    }

    return viewer!;
  }

  async leaveStream(streamId: string, userId: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const activeViewerResult = await db.execute(sql`
        select id
        from live_viewers
        where live_stream_id = ${streamId}::uuid and user_id = ${userId}::uuid and left_at is null
        limit 1
      `);
      const activeViewer = activeViewerResult.rows[0] as { id?: string } | undefined;
      if (!activeViewer?.id) {
        return;
      }

      const endedAt = new Date();
      await db.execute(sql`
        update live_viewers
        set left_at = ${endedAt}
        where id = ${activeViewer.id}::uuid
      `);

      const stream = await this.getLegacyStreamRow(streamId);
      if (stream?.roomId) {
        await db.execute(sql`
          update live_rooms
          set viewer_count = greatest(coalesce(viewer_count, 0) - 1, 0)
          where id = ${String(stream.roomId)}::uuid
        `);
      }
      return;
    }

    const [activeViewer] = await db.select().from(liveViewers)
      .where(and(eq(liveViewers.streamId, streamId), eq(liveViewers.userId, userId), isNull(liveViewers.leftAt)))
      .limit(1);

    if (!activeViewer) {
      return;
    }

    const endedAt = new Date();
    const totalSeconds = await this.finalizeViewerSession(activeViewer, streamId, endedAt);

    const [stream] = await db.select({ roomId: liveStreams.roomId }).from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
    if (stream) {
      await db.update(liveRooms).set({
        totalWatchMinutes: sql`${liveRooms.totalWatchMinutes} + ${Math.floor(totalSeconds / 60)}`,
        updatedAt: endedAt,
      }).where(eq(liveRooms.id, stream.roomId));
    }

    await db.update(liveStreams).set({
      viewerCountCurrent: sql`GREATEST(${liveStreams.viewerCountCurrent} - 1, 0)`,
    }).where(eq(liveStreams.id, streamId));

    const [updatedStream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
    if (updatedStream) {
      const nextTrendingScore = calculateTrendingScore(
        Number(updatedStream.giftRevenueCoins ?? 0),
        Number(updatedStream.viewerCountPeak ?? 0),
        Number(updatedStream.viewerCountCurrent ?? 0),
      );
      await db.update(liveStreams).set({ trendingScore: String(nextTrendingScore) }).where(eq(liveStreams.id, streamId));
    }
  }

  async sendChatMessage(streamId: string, userId: string, message: string) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const stream = await this.getLegacyStreamRow(streamId);
      if (!stream?.roomId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
      }

      const chatSessionId = await this.getLegacyChatSessionId(String(stream.roomId));
      const [savedMessage] = await db.execute(sql`
        insert into chat_messages (id, chat_session_id, user_id, content, is_system, metadata, created_at)
        values (gen_random_uuid(), ${chatSessionId}::uuid, ${userId}::uuid, ${message}, false, '{}'::jsonb, now())
        returning id, user_id as "userId", content as message, created_at as "createdAt"
      `).then((result) => result.rows as Array<Record<string, unknown>>);
      const sender = await this.getLegacyHostProfile(userId);
      const createdAt = savedMessage?.createdAt ? new Date(String(savedMessage.createdAt)) : new Date();

      return {
        id: savedMessage?.id,
        userId,
        username: sender?.displayName ?? sender?.username ?? "User",
        message: String(savedMessage?.message ?? ""),
        timestamp: createdAt.getTime(),
        createdAt: createdAt.toISOString(),
      };
    }

    const [savedMessage] = await db
      .insert(chatMessages)
      .values({
        streamId,
        senderUserId: userId,
        contentText: message,
      })
      .returning();

    const [sender] = await db
      .select({
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      id: savedMessage!.id,
      userId,
      username: sender?.displayName ?? "User",
      message: savedMessage!.contentText ?? "",
      timestamp: savedMessage!.createdAt.getTime(),
      createdAt: savedMessage!.createdAt.toISOString(),
    };
  }

  async getRecentChatMessages(streamId: string, limit = 30) {
    if (await this.getLiveSchemaMode() === "legacy") {
      const stream = await this.getLegacyStreamRow(streamId);
      if (!stream?.roomId) {
        return [];
      }

      const chatSessionId = await this.getLegacyChatSessionId(String(stream.roomId));
      const result = await db.execute(sql`
        select
          cm.id,
          cm.user_id as "userId",
          coalesce(p.display_name, u.username) as username,
          cm.content as message,
          cm.created_at as "createdAt"
        from chat_messages cm
        inner join users u on u.id = cm.user_id
        left join profiles p on p.user_id = u.id
        where cm.chat_session_id = ${chatSessionId}::uuid and coalesce(cm.is_system, false) = false
        order by cm.created_at desc
        limit ${limit}
      `);

      return (result.rows as Array<Record<string, unknown>>)
        .reverse()
        .map((item) => {
          const createdAt = item.createdAt ? new Date(String(item.createdAt)) : new Date();
          return {
            id: item.id,
            userId: item.userId,
            username: item.username,
            message: String(item.message ?? ""),
            timestamp: createdAt.getTime(),
            createdAt: createdAt.toISOString(),
          };
        });
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        userId: chatMessages.senderUserId,
        username: users.displayName,
        message: chatMessages.contentText,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.senderUserId))
      .where(and(eq(chatMessages.streamId, streamId), eq(chatMessages.isDeleted, false)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return messages
      .reverse()
      .map((item) => ({
        id: item.id,
        userId: item.userId,
        username: item.username,
        message: item.message ?? "",
        timestamp: item.createdAt.getTime(),
        createdAt: item.createdAt.toISOString(),
      }));
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

  // ─── PK Battles (delegate to PkService) ───
  async requestPKBattle(hostAId: string, hostBId: string) {
    return this.pkService.requestPKBattle(hostAId, hostBId);
  }

  async joinPKBattle(pkSessionId: string, userId: string) {
    return this.pkService.joinPKBattle(pkSessionId, userId);
  }

  async acceptPKBattle(pkSessionId: string, hostBId: string) {
    return this.pkService.acceptPKBattle(pkSessionId, hostBId);
  }

  async updatePKBattleScore(pkSessionId: string, actorUserId: string, scores: { hostAScore?: number; hostBScore?: number }) {
    return this.pkService.updatePKBattleScore(pkSessionId, actorUserId, scores);
  }

  async getPKBattleState(pkSessionId: string) {
    return this.pkService.getPKBattleState(pkSessionId);
  }

  async getPKBattleRealtimeState(pkSessionId: string, limit = 20) {
    return this.pkService.getPKBattleRealtimeState(pkSessionId, limit);
  }
}
