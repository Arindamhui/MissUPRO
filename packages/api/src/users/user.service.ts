import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  users, profiles, followers, userBlocks, accountDeletionRequests,
  modelReviews, pushTokens,
} from "@missu/db/schema";
import { eq, and, desc, gt, lt } from "drizzle-orm";
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
    let query = db
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
