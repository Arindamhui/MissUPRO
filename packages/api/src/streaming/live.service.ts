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

@Injectable()
export class LiveService {
  constructor(
    private readonly configService: ConfigService,
    private readonly giftService: GiftService,
    private readonly rtcTokenService: RtcTokenService,
    private readonly pkService: PkService,
    private readonly walletService: WalletService,
  ) {}

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

    const liveNow = streamRows.map((row) => ({
      ...row,
      viewerCount: Number(row.viewerCount ?? 0),
      peakViewers: Number(row.peakViewers ?? 0),
      giftRevenueCoins: Number(row.giftRevenueCoins ?? 0),
      trendingScore: Number(row.trendingScore ?? 0),
      startedAt: row.startedAt?.toISOString() ?? null,
    }));

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

  async getViewerRoom(streamId: string) {
    const [preview, bootstrap, activeGifts, coinPackages, topSupportersRows] = await Promise.all([
      this.getStreamPreview(streamId),
      this.configService.getConfigBootstrap(),
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

    const tokenPayload = this.rtcTokenService.issueToken(rtcChannelId, 0, "publisher", 3600);

    return {
      ...stream!,
      agoraToken: tokenPayload.token,
      agoraAppId: tokenPayload.appId,
      expiresAt: tokenPayload.expiresAt,
    };
  }

  async getActiveStreams(limit = 50) {
    const streams = await db.select().from(liveStreams)
      .where(eq(liveStreams.status, "LIVE"))
      .orderBy(desc(liveStreams.startedAt))
      .limit(limit);

    return { streams };
  }

  async issueViewerToken(streamId: string, userId: string) {
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

    return viewer!;
  }

  async leaveStream(streamId: string, userId: string) {
    const [activeViewer] = await db.select().from(liveViewers)
      .where(and(eq(liveViewers.streamId, streamId), eq(liveViewers.userId, userId), isNull(liveViewers.leftAt)))
      .limit(1);

    if (!activeViewer) {
      return;
    }

    await db.update(liveViewers).set({
      leftAt: new Date(),
    }).where(
      eq(liveViewers.id, activeViewer.id),
    );

    await db.update(liveStreams).set({
      viewerCountCurrent: sql`GREATEST(${liveStreams.viewerCountCurrent} - 1, 0)`,
    }).where(eq(liveStreams.id, streamId));
  }

  async sendChatMessage(streamId: string, userId: string, message: string) {
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
