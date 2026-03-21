import { db } from "@missu/db";
import { users, wallets, profiles, agencies } from "@missu/db";
import { eq } from "drizzle-orm";
import { logger } from "@missu/logger";
import { setCache, userProfileCacheKey, agencyCacheKey, deleteCache } from "@missu/cache";
import type { DomainEvent } from "@missu/types";
import type { DomainEventHandler } from "@missu/queue";

// ─── USER_CREATED ───
const handleUserCreated: DomainEventHandler = async (event: DomainEvent) => {
  const { publicId, email } = event.payload as { publicId: string; email: string };
  logger.info("worker_user_created", { aggregateId: event.aggregateId, publicId, email });

  // Ensure wallet exists
  const existing = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.userId, event.aggregateId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(wallets).values({
      userId: event.aggregateId,
      coinBalance: 0,
      diamondBalance: 0,
      lifetimeCoinsPurchased: 0,
      lifetimeCoinsSpent: 0,
      lifetimeDiamondsEarned: 0,
      lifetimeDiamondsWithdrawn: 0,
      version: 1,
    });
    logger.info("worker_wallet_created", { userId: event.aggregateId });
  }

  // Ensure profile record exists
  const existingProfile = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, event.aggregateId))
    .limit(1);

  if (existingProfile.length === 0) {
    await db.insert(profiles).values({
      userId: event.aggregateId,
      bio: null,
      profileCompletenessScore: 10,
    });
    logger.info("worker_profile_created", { userId: event.aggregateId });
  }

  // Warm user cache
  const user = await db.query.users.findFirst({ where: eq(users.id, event.aggregateId) });

  if (user) {
    await setCache(userProfileCacheKey(user.id), {
      id: user.id,
      publicId: user.publicId ?? user.publicUserId ?? null,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      phone: user.phone,
      authProvider: user.authProvider,
      agencyId: null,
      createdAt: user.createdAt.toISOString(),
    }, 300);
  }
};

// ─── HOST_REQUESTED ───
const handleHostRequested: DomainEventHandler = async (event: DomainEvent) => {
  const { userId, requestType, agencyId } = event.payload as {
    userId: string;
    requestType?: string;
    agencyId?: string;
  };
  logger.info("worker_host_requested", { aggregateId: event.aggregateId, userId, requestType, agencyId });

  // In production: send notification to admin / agency owner
  // For now, log the event for monitoring dashboards
};

// ─── HOST_APPROVED ───
const handleHostApproved: DomainEventHandler = async (event: DomainEvent) => {
  const { publicId, userId, agencyId } = event.payload as {
    publicId: string;
    userId: string;
    agencyId?: string;
  };
  logger.info("worker_host_approved", { aggregateId: event.aggregateId, publicId, userId, agencyId });

  // Invalidate user cache so role change is reflected
  await deleteCache(userProfileCacheKey(userId));

  // Warm updated user cache
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (user) {
    await setCache(userProfileCacheKey(userId), {
      id: user.id,
      publicId: user.publicId ?? user.publicUserId ?? null,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      phone: user.phone,
      authProvider: user.authProvider,
      agencyId: agencyId ?? null,
      createdAt: user.createdAt.toISOString(),
    }, 300);
  }

  if (agencyId) {
    await deleteCache(agencyCacheKey(agencyId));
  }
};

// ─── AGENCY_CREATED ───
const handleAgencyCreated: DomainEventHandler = async (event: DomainEvent) => {
  const { publicId, ownerId } = event.payload as { publicId: string; ownerId: string };
  logger.info("worker_agency_created", { aggregateId: event.aggregateId, publicId, ownerId });

  // Warm agency cache
  const agency = await db.query.agencies.findFirst({ where: eq(agencies.id, event.aggregateId) }).catch(() => null);

  if (agency) {
    await setCache(agencyCacheKey(agency.id), {
      id: agency.id,
      publicId: agency.publicId,
      ownerId: agency.ownerId,
      agencyName: agency.agencyName,
      status: agency.status,
      approvalStatus: agency.approvalStatus,
      createdAt: agency.createdAt.toISOString(),
    }, 300);
  }
};

export const domainEventHandlers: Partial<Record<DomainEvent["name"], DomainEventHandler>> = {
  USER_CREATED: handleUserCreated,
  HOST_REQUESTED: handleHostRequested,
  HOST_APPROVED: handleHostApproved,
  AGENCY_CREATED: handleAgencyCreated,
};
