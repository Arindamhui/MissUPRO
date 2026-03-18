import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  partyRooms, partySeats, partyMembers, partyActivities,
  partyActivityParticipants, partyThemes, partyThemeOwnerships, users, wallets, coinTransactions,
} from "@missu/db/schema";
import { eq, and, desc, asc, sql, count, or } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { decodeCursor, encodeCursor, acquireLock, releaseLock } from "@missu/utils";
import bcrypt from "bcryptjs";

@Injectable()
export class PartyService {
  private async getThemeById(themeId: string) {
    const [theme] = await db.select().from(partyThemes).where(eq(partyThemes.id, themeId)).limit(1);
    if (!theme) throw new Error("Theme not found");
    return theme;
  }

  private async hasThemeOwnership(userId: string, themeId: string) {
    const [ownership] = await db
      .select({ id: partyThemeOwnerships.id })
      .from(partyThemeOwnerships)
      .where(and(eq(partyThemeOwnerships.userId, userId), eq(partyThemeOwnerships.themeId, themeId)))
      .limit(1);

    return Boolean(ownership?.id);
  }

  private async ensureThemeAccess(userId: string, themeId: string) {
    const theme = await this.getThemeById(themeId);
    if (!theme.isPremium || !theme.coinPrice || theme.coinPrice <= 0) {
      return theme;
    }

    const owned = await this.hasThemeOwnership(userId, themeId);
    if (!owned) {
      throw new Error("Theme is not unlocked");
    }

    return theme;
  }

  async createRoom(hostUserId: string, data: {
    roomName: string;
    description?: string;
    roomType: string;
    themeId?: string;
    maxSeats?: number;
    maxAudience?: number;
    seatLayoutType?: string;
    entryFeeCoins?: number;
    eventId?: string;
    isPersistent?: boolean;
    password?: string;
  }) {
    const maxSeats = data.maxSeats ?? DEFAULTS.PARTY.DEFAULT_SEATS;
    if (data.themeId) {
      await this.ensureThemeAccess(hostUserId, data.themeId);
    }

    const [room] = await db
      .insert(partyRooms)
      .values({
        hostUserId,
        roomName: data.roomName,
        description: data.description,
        roomType: data.roomType as any,
        themeId: data.themeId,
        maxSeats,
        maxAudience: data.maxAudience,
        seatLayoutType: data.seatLayoutType as any,
        entryFeeCoins: data.entryFeeCoins,
        eventId: data.eventId,
        isPersistent: Boolean(data.isPersistent),
        passwordHash: data.password ? await this.hashPassword(data.password) : null,
        status: "ACTIVE" as any,
        startedAt: new Date(),
      } as any)
      .returning();

    if (!room) throw new Error("Failed to create party room");

    // Create seats
    for (let i = 1; i <= maxSeats; i++) {
      await db.insert(partySeats).values({
        roomId: room.id,
        seatNumber: i,
        status: "EMPTY" as any,
      } as any);
    }

    // Auto-add host as member
    await db.insert(partyMembers).values({
      roomId: room.id,
      userId: hostUserId,
      role: "HOST" as any,
      status: "ACTIVE" as any,
      joinedAt: new Date(),
    });

    return room;
  }

  async joinRoom(roomId: string, userId: string) {
    const [room] = await db.select().from(partyRooms).where(eq(partyRooms.id, roomId)).limit(1);
    if (!room) throw new Error("Room not found");
    if (room.status !== "ACTIVE" && room.status !== "OPEN") throw new Error("Room is not active");
    if (room.passwordHash) throw new Error("Room requires a password");

    return this.addMember(roomId, userId);
  }

  async joinRoomWithPassword(roomId: string, userId: string, password: string) {
    const [room] = await db.select().from(partyRooms).where(eq(partyRooms.id, roomId)).limit(1);
    if (!room) throw new Error("Room not found");
    if (room.status !== "ACTIVE" && room.status !== "OPEN") throw new Error("Room is not active");

    if (room.passwordHash) {
      const matches = await bcrypt.compare(password, room.passwordHash);
      if (!matches) {
        throw new Error("Invalid password");
      }
    }

    return this.addMember(roomId, userId);
  }

  private async addMember(roomId: string, userId: string) {
    const existing = await db.select().from(partyMembers).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.userId, userId), eq(partyMembers.status, "ACTIVE" as any))).limit(1);
    if (existing[0]) return existing[0];

    const memberCount = await db.select({ count: count() }).from(partyMembers).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.status, "ACTIVE" as any)));
    const [room] = await db.select().from(partyRooms).where(eq(partyRooms.id, roomId)).limit(1);
    const roomCapacity = (room?.maxSeats ?? DEFAULTS.PARTY.MAX_MEMBERS) + (room?.maxAudience ?? 0);
    if (Number(memberCount[0]?.count ?? 0) >= roomCapacity) {
      throw new Error("Room is full");
    }

    const [member] = await db.insert(partyMembers).values({ roomId, userId, role: "AUDIENCE" as any, status: "ACTIVE" as any, joinedAt: new Date() }).returning();
    return member;
  }

  async leaveRoom(roomId: string, userId: string) {
    await db.update(partyMembers).set({ status: "LEFT" as any, leftAt: new Date() }).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.userId, userId)));
    await db.update(partySeats).set({ occupantUserId: null, status: "EMPTY" as any }).where(and(eq(partySeats.roomId, roomId), eq(partySeats.occupantUserId, userId)));
    return { success: true };
  }

  async closeRoom(roomId: string, hostUserId: string) {
    const [room] = await db.select().from(partyRooms).where(and(eq(partyRooms.id, roomId), eq(partyRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");

    await db.update(partyRooms).set({ status: "CLOSED" as any, endedAt: new Date() }).where(eq(partyRooms.id, roomId));
    await db.update(partyMembers).set({ status: "LEFT" as any, leftAt: new Date() }).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.status, "ACTIVE" as any)));
    return { success: true };
  }

  async pauseRoom(roomId: string, hostUserId: string) {
    await this.verifyHost(roomId, hostUserId);
    const [updated] = await db.update(partyRooms).set({ status: "PAUSED" as any }).where(eq(partyRooms.id, roomId)).returning();
    return updated;
  }

  async resumeRoom(roomId: string, hostUserId: string) {
    await this.verifyHost(roomId, hostUserId);
    const [updated] = await db.update(partyRooms).set({ status: "ACTIVE" as any }).where(eq(partyRooms.id, roomId)).returning();
    return updated;
  }

  async getRoomState(roomId: string) {
    const [room] = await db.select().from(partyRooms).where(eq(partyRooms.id, roomId)).limit(1);
    if (!room) throw new Error("Room not found");

    const members = await db
      .select({
        userId: partyMembers.userId,
        role: partyMembers.role,
        joinedAt: partyMembers.joinedAt,
        displayName: users.username,
        avatarUrl: sql<string | null>`null`,
      })
      .from(partyMembers)
      .innerJoin(users, eq(users.id, partyMembers.userId))
      .where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.status, "ACTIVE" as any)));

    const seats = await db.select().from(partySeats).where(eq(partySeats.roomId, roomId)).orderBy(asc(partySeats.seatNumber));

    const activities = await db
      .select()
      .from(partyActivities)
      .where(and(eq(partyActivities.roomId, roomId), eq(partyActivities.status, "ACTIVE" as any)));

    let theme = null;
    if (room.themeId) {
      [theme] = await db.select().from(partyThemes).where(eq(partyThemes.id, room.themeId)).limit(1);
    }

    return { room, members, seats, activities, theme };
  }

  async listActiveRooms(cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const activeCount = db
      .select({ roomId: partyMembers.roomId, cnt: count().as("cnt") })
      .from(partyMembers)
      .where(eq(partyMembers.status, "ACTIVE" as any))
      .groupBy(partyMembers.roomId)
      .as("activeCount");

    const results = await db
      .select({
        id: partyRooms.id,
        roomName: partyRooms.roomName,
        roomType: partyRooms.roomType,
        hostUserId: partyRooms.hostUserId,
        maxSeats: partyRooms.maxSeats,
        hasPassword: sql<boolean>`${partyRooms.passwordHash} IS NOT NULL`,
        hostName: users.username,
        hostAvatar: sql<string | null>`null`,
      })
      .from(partyRooms)
      .innerJoin(users, eq(users.id, partyRooms.hostUserId))
      .where(or(eq(partyRooms.status, "ACTIVE" as any), eq(partyRooms.status, "OPEN" as any)))
      .orderBy(desc(partyRooms.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  // ─── Seat Management ───
  async claimSeat(roomId: string, userId: string, seatNumber: number) {
    const [seat] = await db
      .select()
      .from(partySeats)
      .where(and(eq(partySeats.roomId, roomId), eq(partySeats.seatNumber, seatNumber)))
      .limit(1);

    if (!seat) throw new Error("Seat not found");
    if (seat.status !== "EMPTY" && !(seat.status === "RESERVED" && seat.reservedForUserId === userId)) {
      throw new Error("Seat is not available");
    }

    // Release any current seat
    await db.update(partySeats).set({ occupantUserId: null, status: "EMPTY" as any }).where(and(eq(partySeats.roomId, roomId), eq(partySeats.occupantUserId, userId)));
    await db.update(partyMembers).set({ role: "SEATED" as any }).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.userId, userId), eq(partyMembers.status, "ACTIVE" as any)));

    const [updated] = await db
      .update(partySeats)
      .set({ occupantUserId: userId, reservedForUserId: null, status: "OCCUPIED" as any, occupiedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(partySeats.id, seat.id), or(eq(partySeats.status, "EMPTY" as any), eq(partySeats.status, "RESERVED" as any))))
      .returning();

    if (!updated) throw new Error("Seat was taken");
    return updated;
  }

  async vacateSeat(roomId: string, userId: string) {
    await db.update(partySeats).set({ occupantUserId: null, status: "EMPTY" as any }).where(and(eq(partySeats.roomId, roomId), eq(partySeats.occupantUserId, userId)));
    await db.update(partyMembers).set({ role: "AUDIENCE" as any }).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.userId, userId), eq(partyMembers.status, "ACTIVE" as any)));
    return { success: true };
  }

  async lockSeat(roomId: string, hostUserId: string, seatNumber: number) {
    await this.verifyHost(roomId, hostUserId);
    const [updated] = await db.update(partySeats).set({ status: "LOCKED" as any, occupantUserId: null }).where(and(eq(partySeats.roomId, roomId), eq(partySeats.seatNumber, seatNumber))).returning();
    return updated;
  }

  async reserveSeat(roomId: string, hostUserId: string, seatNumber: number, forUserId: string) {
    await this.verifyHost(roomId, hostUserId);
    const [updated] = await db.update(partySeats).set({ status: "RESERVED" as any, reservedForUserId: forUserId }).where(and(eq(partySeats.roomId, roomId), eq(partySeats.seatNumber, seatNumber))).returning();
    return updated;
  }

  // ─── Member Management ───
  async kickUser(roomId: string, hostUserId: string, userId: string) {
    await this.verifyHost(roomId, hostUserId);
    await this.leaveRoom(roomId, userId);
    return { success: true };
  }

  async muteSeat(roomId: string, hostUserId: string, seatNumber: number) {
    await this.verifyHost(roomId, hostUserId);
    await db.update(partySeats).set({ isMuted: true }).where(and(eq(partySeats.roomId, roomId), eq(partySeats.seatNumber, seatNumber)));
    return { success: true };
  }

  async promoteToCoHost(roomId: string, hostUserId: string, userId: string) {
    await this.verifyHost(roomId, hostUserId);
    await db.update(partyMembers).set({ role: "CO_HOST" as any }).where(and(eq(partyMembers.roomId, roomId), eq(partyMembers.userId, userId)));
    return { success: true };
  }

  // ─── Theme ───
  async updateTheme(roomId: string, hostUserId: string, themeId: string) {
    await this.verifyHost(roomId, hostUserId);
    await this.ensureThemeAccess(hostUserId, themeId);
    const [updated] = await db.update(partyRooms).set({ themeId }).where(eq(partyRooms.id, roomId)).returning();
    return updated;
  }

  async listAvailableThemes() {
    return db.select().from(partyThemes).where(eq(partyThemes.status, "ACTIVE" as any)).orderBy(asc(partyThemes.themeName));
  }

  async listOwnedThemes(userId: string) {
    return db
      .select({
        ownershipId: partyThemeOwnerships.id,
        acquiredAt: partyThemeOwnerships.acquiredAt,
        purchasePriceCoins: partyThemeOwnerships.purchasePriceCoins,
        themeId: partyThemes.id,
        themeName: partyThemes.themeName,
        description: partyThemes.description,
        backgroundAssetUrl: partyThemes.backgroundAssetUrl,
        seatFrameAssetUrl: partyThemes.seatFrameAssetUrl,
        ambientSoundUrl: partyThemes.ambientSoundUrl,
        colorSchemeJson: partyThemes.colorSchemeJson,
        isPremium: partyThemes.isPremium,
        coinPrice: partyThemes.coinPrice,
        seasonTag: partyThemes.seasonTag,
      })
      .from(partyThemeOwnerships)
      .innerJoin(partyThemes, eq(partyThemes.id, partyThemeOwnerships.themeId))
      .where(eq(partyThemeOwnerships.userId, userId))
      .orderBy(desc(partyThemeOwnerships.acquiredAt), asc(partyThemes.themeName));
  }

  async purchaseTheme(userId: string, themeId: string) {
    const theme = await this.getThemeById(themeId);
    const existingOwnership = await this.hasThemeOwnership(userId, themeId);
    if (existingOwnership || !theme.coinPrice || theme.coinPrice === 0) {
      if (!existingOwnership && (!theme.coinPrice || theme.coinPrice === 0)) {
        await db.insert(partyThemeOwnerships).values({
          userId,
          themeId,
          purchasePriceCoins: 0,
        } as any).onConflictDoNothing();
      }
      return { success: true, theme, alreadyOwned: existingOwnership };
    }

    const lock = await acquireLock(`wallet:${userId}`, 5000);
    if (!lock) throw new Error("Could not acquire wallet lock");

    try {
      const stillOwned = await this.hasThemeOwnership(userId, themeId);
      if (stillOwned) {
        return { success: true, theme, alreadyOwned: true };
      }

      const [wallet] = await db
        .select({
          id: wallets.id,
          coinBalance: wallets.coinBalance,
        })
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .limit(1);
      if (!wallet || wallet.coinBalance < theme.coinPrice) throw new Error("Insufficient coins");

      const newBalance = wallet.coinBalance - theme.coinPrice;
      await db.update(wallets).set({ coinBalance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id));
      await db.execute(sql`
        insert into coin_transactions (
          user_id,
          wallet_id,
          amount,
          direction,
          balance_after,
          reason,
          reference_id,
          metadata,
          created_at
        )
        values (
          ${userId}::uuid,
          ${wallet.id}::uuid,
          ${-theme.coinPrice},
          'DEBIT',
          ${newBalance},
          'THEME_PURCHASE',
          ${themeId}::uuid,
          ${JSON.stringify({ themeName: theme.themeName })}::jsonb,
          now()
        )
      `);
      await db.insert(partyThemeOwnerships).values({
        userId,
        themeId,
        purchasePriceCoins: theme.coinPrice,
      } as any).onConflictDoNothing();

      return { success: true, theme };
    } finally {
      await releaseLock(`wallet:${userId}`, lock);
    }
  }

  // ─── Activities ───
  async startActivity(roomId: string, hostUserId: string, activityType: string, configJson?: any) {
    await this.verifyHost(roomId, hostUserId);

    const [activity] = await db
      .insert(partyActivities)
      .values({ roomId, activityType: activityType as any, createdByUserId: hostUserId, status: "ACTIVE" as any, configJson, startedAt: new Date() })
      .returning();

    return activity;
  }

  async joinActivity(roomId: string, userId: string, activityId: string) {
    const [activity] = await db.select().from(partyActivities).where(and(eq(partyActivities.id, activityId), eq(partyActivities.roomId, roomId))).limit(1);
    if (!activity || activity.status !== "ACTIVE") throw new Error("Activity not found or not active");

    const [participant] = await db
      .insert(partyActivityParticipants)
      .values({ activityId, userId, coinsContributed: 0 })
      .onConflictDoNothing()
      .returning();

    return participant;
  }

  async endActivity(roomId: string, hostUserId: string, activityId: string) {
    await this.verifyHost(roomId, hostUserId);
    const [updated] = await db
      .update(partyActivities)
      .set({ status: "ENDED" as any, endedAt: new Date() })
      .where(and(eq(partyActivities.id, activityId), eq(partyActivities.roomId, roomId)))
      .returning();
    return updated;
  }

  async getActivityState(activityId: string) {
    const [activity] = await db.select().from(partyActivities).where(eq(partyActivities.id, activityId)).limit(1);
    if (!activity) throw new Error("Activity not found");

    const participants = await db
      .select({
        userId: partyActivityParticipants.userId,
        coinsContributed: partyActivityParticipants.coinsContributed,
        displayName: users.username,
        avatarUrl: sql<string | null>`null`,
      })
      .from(partyActivityParticipants)
      .innerJoin(users, eq(users.id, partyActivityParticipants.userId))
      .where(eq(partyActivityParticipants.activityId, activityId))
      .orderBy(desc(partyActivityParticipants.coinsContributed));

    return { activity, participants };
  }

  private async verifyHost(roomId: string, hostUserId: string) {
    const [room] = await db.select().from(partyRooms).where(and(eq(partyRooms.id, roomId), eq(partyRooms.hostUserId, hostUserId))).limit(1);
    if (!room) throw new Error("Not the host");
    return room;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
