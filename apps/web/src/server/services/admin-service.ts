import { db } from "@missu/db";
import { deleteCache, agencyCacheKey, userProfileCacheKey } from "@missu/cache";
import { decodeCursor, encodeCursor } from "@missu/utils";
import { ConflictError, NotFoundError } from "@missu/utils";
import { agencyRepository } from "../repositories/agency-repository";
import { auditRepository } from "../repositories/audit-repository";
import { hostRepository } from "../repositories/host-repository";
import { userRepository } from "../repositories/user-repository";
import type { AdminApproveAgencyInput, UpdateAgencyInput } from "../validators/agency";
import type { SessionActor } from "@missu/types";
import type { RequestContext } from "../lib/request";
import type { UpdateAdminHostInput, UpdateAdminUserInput } from "../validators/admin";

async function paginate<T>(loader: (limit: number, offset: number) => Promise<T[]>, limit: number, cursor?: string) {
  const offset = cursor ? decodeCursor(cursor) : 0;
  const items = await loader(limit + 1, offset);
  const nextCursor = items.length > limit ? encodeCursor(offset + limit) : null;
  return { items: items.slice(0, limit), nextCursor };
}

export const adminService = {
  async dashboard() {
    const [usersCount, agenciesCount, hostsCount] = await Promise.all([
      userRepository.count(),
      agencyRepository.count(),
      hostRepository.count(),
    ]);

    return {
      totals: {
        users: usersCount,
        agencies: agenciesCount,
        hosts: hostsCount,
      },
    };
  },

  async listUsers(limit: number, cursor?: string) {
    return paginate((pageLimit, offset) => userRepository.list(pageLimit, offset), limit, cursor);
  },

  async listAgencies(limit: number, cursor?: string) {
    return paginate((pageLimit, offset) => agencyRepository.list(pageLimit, offset), limit, cursor);
  },

  async listHosts(limit: number, cursor?: string) {
    return paginate((pageLimit, offset) => hostRepository.list(pageLimit, offset), limit, cursor);
  },

  async approveAgency(actor: SessionActor, input: AdminApproveAgencyInput, context: RequestContext) {
    const updated = await db.transaction(async (tx) => {
      const agency = await agencyRepository.getById(input.agencyId, tx);

      if (!agency) {
        throw new NotFoundError("Agency not found");
      }

      const nextAgency = await agencyRepository.update(agency.id, {
        status: input.approve ? "ACTIVE" : "REJECTED",
        approvalStatus: input.approve ? "APPROVED" : "REJECTED",
        approvedAt: input.approve ? new Date() : null,
        rejectedAt: input.approve ? null : new Date(),
      }, tx);

      if (!nextAgency) {
        throw new ConflictError("Unable to update agency state");
      }

      if (input.approve && input.assignOwnerAgencyRole && agency.ownerId) {
        await userRepository.update(agency.ownerId, {
          platformRole: "AGENCY",
          authRole: "agency",
        }, tx);
      }

      await auditRepository.write({
        actorUserId: actor.userId,
        actorPlatformRole: actor.role,
        action: input.approve ? "ADMIN_APPROVED_AGENCY" : "ADMIN_REJECTED_AGENCY",
        entityType: "AGENCY",
        entityId: agency.id,
        metadataJson: { requestId: context.requestId, notes: input.notes ?? null },
      }, tx);

      return nextAgency;
    });

    await deleteCache(agencyCacheKey(updated.id));
    return updated;
  },

  async updateUser(actor: SessionActor, userId: string, input: UpdateAdminUserInput, context: RequestContext) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const updated = await userRepository.update(userId, {
      displayName: input.displayName,
      phone: input.phone,
      status: input.status,
      role: input.role,
      platformRole: input.platformRole,
      authRole: input.authRole === undefined ? undefined : input.authRole,
      deletedAt: input.softDelete ? new Date() : user.deletedAt,
    });

    if (!updated) {
      throw new ConflictError("Unable to update user");
    }

    await deleteCache(userProfileCacheKey(userId));
    await auditRepository.write({
      actorUserId: actor.userId,
      actorPlatformRole: actor.role,
      action: "ADMIN_UPDATED_USER",
      entityType: "USER",
      entityId: userId,
      metadataJson: { requestId: context.requestId },
    });

    return updated;
  },

  async updateAgency(actor: SessionActor, agencyId: string, input: UpdateAgencyInput, context: RequestContext) {
    const agency = await agencyRepository.getById(agencyId);

    if (!agency) {
      throw new NotFoundError("Agency not found");
    }

    const metadata = {
      ...((agency.metadataJson as Record<string, unknown> | null) ?? {}),
      ...(input.defaultForIndependentHosts === undefined ? {} : { defaultForIndependentHosts: input.defaultForIndependentHosts }),
    };

    const updated = await agencyRepository.update(agencyId, {
      agencyName: input.agencyName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      country: input.country,
      status: input.status,
      approvalStatus: input.approvalStatus,
      metadataJson: metadata,
      deletedAt: input.softDelete ? new Date() : agency.deletedAt,
    });

    if (!updated) {
      throw new ConflictError("Unable to update agency");
    }

    await deleteCache(agencyCacheKey(agencyId));
    await auditRepository.write({
      actorUserId: actor.userId,
      actorPlatformRole: actor.role,
      action: "ADMIN_UPDATED_AGENCY",
      entityType: "AGENCY",
      entityId: agencyId,
      metadataJson: { requestId: context.requestId },
    });

    return updated;
  },

  async updateHost(actor: SessionActor, hostId: string, input: UpdateAdminHostInput, context: RequestContext) {
    const host = await hostRepository.getById(hostId);

    if (!host) {
      throw new NotFoundError("Host not found");
    }

    const updated = await hostRepository.update(hostId, {
      status: input.status,
      agencyId: input.agencyId,
      reviewNotes: input.reviewNotes,
    });

    if (!updated) {
      throw new ConflictError("Unable to update host");
    }

    await deleteCache(userProfileCacheKey(updated.userId));
    await auditRepository.write({
      actorUserId: actor.userId,
      actorPlatformRole: actor.role,
      action: "ADMIN_UPDATED_HOST",
      entityType: "HOST",
      entityId: hostId,
      tenantAgencyId: updated.agencyId,
      metadataJson: { requestId: context.requestId, softDelete: input.softDelete ?? false },
    });

    return updated;
  },
};