import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  users, profiles, followers, userBlocks, accountDeletionRequests,
  modelReviews, pushTokens, userLevels, levels, userBadges, badges, userInboxPreferences,
} from "@missu/db/schema";
import { eq, and, desc, gt, lt, sql } from "drizzle-orm";
import { getPresence, getPresenceBulk as redisGetPresenceBulk } from "@missu/utils";

const DEFAULT_INBOX_PREFERENCES = {
  dmPrivacyRule: "ALL_USERS",
  allowLiveStreamLinks: true,
} as const;

@Injectable()
export class UserService {
  private userSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private followerSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  private async getUserSchemaMode() {
    if (!this.userSchemaModePromise) {
      this.userSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'display_name'
        ) as has_display_name
      `).then((result) => {
        const value = result.rows[0] as { has_display_name?: boolean | string | number } | undefined;
        return value?.has_display_name ? "modern" : "legacy";
      });
    }

    return this.userSchemaModePromise;
  }

  private async getFollowerSchemaMode() {
    if (!this.followerSchemaModePromise) {
      this.followerSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'followers'
            and column_name = 'followed_user_id'
        ) as has_followed_user_id
      `).then((result) => {
        const value = result.rows[0] as { has_followed_user_id?: boolean | string | number } | undefined;
        return value?.has_followed_user_id ? "modern" : "legacy";
      });
    }

    return this.followerSchemaModePromise;
  }

  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async getProfile(userId: string) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return profile ?? null;
  }

  async getMyProfile(userId: string) {
    if (await this.getUserSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          u.id,
          u.email,
          coalesce(p.display_name, u.username) as "displayName",
          u.username,
          p.avatar_url as "avatarUrl",
          p.city,
          'en'::text as "preferredLocale",
          p.country,
          p.bio,
          trim(concat_ws(', ', p.city, p.country)) as "locationDisplay"
        from users u
        left join profiles p on p.user_id = u.id
        where u.id = ${userId}::uuid
        limit 1
      `);

      return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
    }

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
    if (await this.getUserSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          u.id as "userId",
          coalesce(p.display_name, u.username) as "displayName",
          u.username,
          p.avatar_url as "avatarUrl",
          p.bio,
          trim(concat_ws(', ', p.city, p.country)) as "locationDisplay",
          coalesce(p.level, 1) as "currentLevel",
          concat('Level ', coalesce(p.level, 1)) as "levelName"
        from users u
        left join profiles p on p.user_id = u.id
        where u.id = ${userId}::uuid
        limit 1
      `);

      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        return null;
      }

      const presence = await getPresence(userId);
      return {
        ...row,
        currentLevel: Number(row.currentLevel ?? 1),
        levelName: row.levelName ?? "Level 1",
        activeBadge: null,
        presenceStatus: presence ?? "OFFLINE",
      };
    }

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

  async getInboxPreferences(userId: string) {
    const [preferences] = await db
      .select()
      .from(userInboxPreferences)
      .where(eq(userInboxPreferences.userId, userId))
      .limit(1);

    return preferences ?? {
      id: null,
      userId,
      ...DEFAULT_INBOX_PREFERENCES,
      createdAt: null,
      updatedAt: null,
    };
  }

  async updateInboxPreferences(
    userId: string,
    input: {
      dmPrivacyRule?: "ALL_USERS" | "FOLLOWED_USERS" | "HIGHER_LEVEL_USERS";
      allowLiveStreamLinks?: boolean;
    },
  ) {
    const current = await this.getInboxPreferences(userId);
    const [updated] = await db
      .insert(userInboxPreferences)
      .values({
        userId,
        dmPrivacyRule: input.dmPrivacyRule ?? current.dmPrivacyRule ?? DEFAULT_INBOX_PREFERENCES.dmPrivacyRule,
        allowLiveStreamLinks: input.allowLiveStreamLinks ?? current.allowLiveStreamLinks ?? DEFAULT_INBOX_PREFERENCES.allowLiveStreamLinks,
      })
      .onConflictDoUpdate({
        target: [userInboxPreferences.userId],
        set: {
          dmPrivacyRule: input.dmPrivacyRule ?? current.dmPrivacyRule ?? DEFAULT_INBOX_PREFERENCES.dmPrivacyRule,
          allowLiveStreamLinks: input.allowLiveStreamLinks ?? current.allowLiveStreamLinks ?? DEFAULT_INBOX_PREFERENCES.allowLiveStreamLinks,
          updatedAt: new Date(),
        },
      })
      .returning();

    return updated;
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
    if (await this.getFollowerSchemaMode() === "legacy") {
      await db.execute(sql`
        insert into followers (follower_user_id, following_user_id, created_at)
        values (${followerId}::uuid, ${followingId}::uuid, now())
        on conflict do nothing
      `);
      return { success: true };
    }

    await db.insert(followers).values({ followerUserId: followerId, followedUserId: followingId });
    return { success: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    if (await this.getFollowerSchemaMode() === "legacy") {
      await db.execute(sql`
        delete from followers
        where follower_user_id = ${followerId}::uuid
          and following_user_id = ${followingId}::uuid
      `);
      return { success: true };
    }

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
    if (await this.getFollowerSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select id
        from followers
        where follower_user_id = ${followerId}::uuid
          and following_user_id = ${followingId}::uuid
        limit 1
      `);

      return { isFollowing: Boolean(result.rows[0]) };
    }

    const [result] = await db
      .select({ id: followers.id })
      .from(followers)
      .where(and(eq(followers.followerUserId, followerId), eq(followers.followedUserId, followingId)))
      .limit(1);

    return { isFollowing: !!result };
  }

  async listFollowers(userId: string, cursor?: string, limit = 30) {
    if (await this.getFollowerSchemaMode() === "legacy") {
      const results = await db.execute(sql`
        select
          f.id,
          f.created_at as "createdAt",
          u.id as "userId",
          coalesce(p.display_name, u.username) as "displayName",
          u.username,
          p.avatar_url as "avatarUrl",
          p.bio,
          trim(concat_ws(', ', p.city, p.country)) as "locationDisplay"
        from followers f
        inner join users u on u.id = f.follower_user_id
        left join profiles p on p.user_id = u.id
        where f.following_user_id = ${userId}::uuid
          ${cursor ? sql`and f.created_at < ${new Date(cursor)}` : sql``}
        order by f.created_at desc
        limit ${limit + 1}
      `);

      const rows = results.rows as Array<Record<string, unknown> & { createdAt?: Date | string }>;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      return {
        items,
        nextCursor: hasMore ? new Date(String(items[items.length - 1]?.createdAt ?? new Date())).toISOString() : null,
      };
    }

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
    if (await this.getFollowerSchemaMode() === "legacy") {
      const results = await db.execute(sql`
        select
          f.id,
          f.created_at as "createdAt",
          u.id as "userId",
          coalesce(p.display_name, u.username) as "displayName",
          u.username,
          p.avatar_url as "avatarUrl",
          p.bio,
          trim(concat_ws(', ', p.city, p.country)) as "locationDisplay"
        from followers f
        inner join users u on u.id = f.following_user_id
        left join profiles p on p.user_id = u.id
        where f.follower_user_id = ${userId}::uuid
          ${cursor ? sql`and f.created_at < ${new Date(cursor)}` : sql``}
        order by f.created_at desc
        limit ${limit + 1}
      `);

      const rows = results.rows as Array<Record<string, unknown> & { createdAt?: Date | string }>;
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      return {
        items,
        nextCursor: hasMore ? new Date(String(items[items.length - 1]?.createdAt ?? new Date())).toISOString() : null,
      };
    }

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
    if (await this.getUserSchemaMode() === "legacy") {
      const [existingProfile] = await db.execute(sql`
        select user_id as "userId", country
        from profiles
        where user_id = ${userId}::uuid
        limit 1
      `).then((result) => result.rows as Array<{ userId?: string; country?: string | null }>);

      const nextCity = input.city !== undefined
        ? input.city
        : input.locationDisplay !== undefined
          ? input.locationDisplay
          : existingProfile?.country ?? null;
      const nextCountry = existingProfile?.country ?? null;

      if (existingProfile?.userId) {
        await db.execute(sql`
          update profiles
          set display_name = coalesce(${input.displayName ?? null}, display_name),
              avatar_url = ${input.avatarUrl ?? null},
              city = ${nextCity ?? null},
              bio = ${input.bio ?? null},
              updated_at = now()
          where user_id = ${userId}::uuid
        `);
      } else {
        await db.execute(sql`
          insert into profiles (
            id,
            user_id,
            display_name,
            bio,
            avatar_url,
            country,
            city,
            preferred_timezone,
            level,
            xp,
            follower_count,
            following_count,
            created_at,
            updated_at
          )
          values (
            gen_random_uuid(),
            ${userId}::uuid,
            ${input.displayName ?? null},
            ${input.bio ?? null},
            ${input.avatarUrl ?? null},
            ${nextCountry},
            ${nextCity ?? null},
            'UTC',
            1,
            0,
            0,
            0,
            now(),
            now()
          )
        `);
      }

      return this.getMyProfile(userId);
    }

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
