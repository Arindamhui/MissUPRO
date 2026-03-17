import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  users, profiles, followers, userBlocks, accountDeletionRequests,
  modelReviews, pushTokens, userLevels, levels, userBadges, badges,
} from "@missu/db/schema";
import { eq, and, desc, gt, lt, sql } from "drizzle-orm";
import { getPresence, getPresenceBulk as redisGetPresenceBulk } from "@missu/utils";

@Injectable()
export class UserService {
  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async getProfile(userId: string) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return profile ?? null;
  }

  async getMyProfile(userId: string) {
    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        city: users.city,
        preferredLocale: users.preferredLocale,
        country: users.country,
        bio: profiles.bio,
        locationDisplay: profiles.locationDisplay,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    return result ?? null;
  }

  async getPublicUserSummary(userId: string) {
    const [result] = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: profiles.bio,
        locationDisplay: profiles.locationDisplay,
        currentLevel: levels.levelNumber,
        levelName: levels.levelName,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(userLevels, and(eq(userLevels.userId, users.id), eq(userLevels.levelTrack, "USER" as any)))
      .leftJoin(levels, eq(levels.id, userLevels.currentLevelId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result) {
      return null;
    }

    const presence = await getPresence(userId);
    const [activeBadge] = await db
      .select({
        badgeKey: badges.badgeKey,
        name: badges.name,
        iconUrl: badges.iconUrl,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt))
      .limit(1);

    return {
      ...result,
      currentLevel: Number(result.currentLevel ?? 1),
      levelName: result.levelName ?? "Spark",
      activeBadge: activeBadge ?? null,
      presenceStatus: presence ?? "OFFLINE",
    };
  }

  async blockUser(userId: string, targetUserId: string, reason?: string) {
    await db.insert(userBlocks).values({
      blockerUserId: userId,
      blockedUserId: targetUserId,
      reason,
    });
    return { success: true };
  }

  async unblockUser(userId: string, targetUserId: string) {
    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerUserId, userId),
          eq(userBlocks.blockedUserId, targetUserId),
        ),
      );
    return { success: true };
  }

  async getBlockedUsers(userId: string) {
    return db
      .select()
      .from(userBlocks)
      .where(eq(userBlocks.blockerUserId, userId))
      .orderBy(desc(userBlocks.createdAt));
  }

  async isBlocked(userId: string, targetUserId: string) {
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerUserId, userId),
          eq(userBlocks.blockedUserId, targetUserId),
        ),
      )
      .limit(1);
    return !!block;
  }

  async requestAccountDeletion(userId: string, reason?: string) {
    const [request] = await db
      .insert(accountDeletionRequests)
      .values({
        userId,
        reason: reason ?? "User requested deletion",
        coolingOffExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();
    return request!;
  }

  async followUser(followerId: string, followingId: string) {
    await db.insert(followers).values({ followerUserId: followerId, followedUserId: followingId });
    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    await db
      .delete(followers)
      .where(
        and(
          eq(followers.followerUserId, followerId),
          eq(followers.followedUserId, followingId),
        ),
      );
    return { success: true };
  }

  async isFollowing(followerId: string, followingId: string) {
    const [result] = await db
      .select({ id: followers.id })
      .from(followers)
      .where(and(eq(followers.followerUserId, followerId), eq(followers.followedUserId, followingId)))
      .limit(1);

    return { isFollowing: !!result };
  }

  async listFollowers(userId: string, cursor?: string, limit = 30) {
    const query = db
      .select({
        id: followers.id,
        createdAt: followers.createdAt,
        userId: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: profiles.bio,
        locationDisplay: profiles.locationDisplay,
      })
      .from(followers)
      .innerJoin(users, eq(users.id, followers.followerUserId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(followers.followedUserId, userId),
          cursor ? lt(followers.createdAt, new Date(cursor)) : undefined,
        ),
      )
      .orderBy(desc(followers.createdAt))
      .limit(limit + 1);

    const results = await query;
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
    };
  }

  async listFollowing(userId: string, cursor?: string, limit = 30) {
    const query = db
      .select({
        id: followers.id,
        createdAt: followers.createdAt,
        userId: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: profiles.bio,
        locationDisplay: profiles.locationDisplay,
      })
      .from(followers)
      .innerJoin(users, eq(users.id, followers.followedUserId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(followers.followerUserId, userId),
          cursor ? lt(followers.createdAt, new Date(cursor)) : undefined,
        ),
      )
      .orderBy(desc(followers.createdAt))
      .limit(limit + 1);

    const results = await query;
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
    };
  }

  async updateMyProfile(
    userId: string,
    input: {
      displayName?: string;
      avatarUrl?: string | null;
      city?: string | null;
      bio?: string | null;
      locationDisplay?: string | null;
    },
  ) {
    const userPatch: Record<string, string | Date | null | undefined> = {};
    if (input.displayName !== undefined) userPatch.displayName = input.displayName;
    if (input.avatarUrl !== undefined) userPatch.avatarUrl = input.avatarUrl;
    if (input.city !== undefined) userPatch.city = input.city;

    if (Object.keys(userPatch).length > 0) {
      userPatch.updatedAt = new Date();
      await db.update(users).set(userPatch).where(eq(users.id, userId));
    }

    const profilePatch: Record<string, string | Date | null | number | undefined> = {
      updatedAt: new Date(),
    };
    if (input.bio !== undefined) profilePatch.bio = input.bio;
    if (input.locationDisplay !== undefined) profilePatch.locationDisplay = input.locationDisplay;

    const completenessScore = [input.bio, input.locationDisplay].filter((value) => Boolean(value && String(value).trim())).length * 25;
    profilePatch.profileCompletenessScore = completenessScore;

    await db
      .insert(profiles)
      .values({
        userId,
        bio: input.bio ?? null,
        locationDisplay: input.locationDisplay ?? null,
        profileCompletenessScore: completenessScore,
      })
      .onConflictDoUpdate({
        target: [profiles.userId],
        set: profilePatch,
      });

    return this.getMyProfile(userId);
  }

  async submitModelReview(
    userId: string,
    modelUserId: string,
    callSessionId: string,
    rating: number,
    reviewText?: string,
  ) {
    const [review] = await db
      .insert(modelReviews)
      .values({
        modelUserId,
        reviewerUserId: userId,
        callSessionId,
        rating,
        reviewText,
      })
      .returning();
    return review!;
  }

  async getModelReviews(modelUserId: string, limit: number, cursor?: string) {
    const query = db
      .select()
      .from(modelReviews)
      .where(
        and(
          eq(modelReviews.modelUserId, modelUserId),
          eq(modelReviews.isVisible, true),
          cursor ? lt(modelReviews.createdAt, new Date(cursor)) : undefined,
        ),
      )
      .orderBy(desc(modelReviews.createdAt))
      .limit(limit + 1);

    const results = await query;
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
    };
  }

  async getPresenceStatus(userId: string) {
    const status = await getPresence(userId);
    return { userId, status: status ?? "OFFLINE" };
  }

  async getPresenceBulk(userIds: string[]) {
    const presenceMap = await redisGetPresenceBulk(userIds);
    return userIds.map((id) => ({
      userId: id,
      status: presenceMap.get(id) ?? "OFFLINE",
    }));
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: string,
    deviceId: string,
  ) {
    const [result] = await db
      .insert(pushTokens)
      .values({
        userId,
        token,
        platform: platform as any,
        deviceId,
        appVersion: "1.0.0",
      })
      .onConflictDoUpdate({
        target: [pushTokens.token],
        set: { userId, platform: platform as any, deviceId, updatedAt: new Date() },
      })
      .returning();
    return result!;
  }
}
