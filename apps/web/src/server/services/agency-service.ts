import { db } from "@missu/db";
import { agencyCacheKey, deleteCache, setCache } from "@missu/cache";
import { createDomainEvent, publishDomainEvent } from "@missu/queue";
import { generateUniquePublicId, ConflictError, NotFoundError, AuthorizationError } from "@missu/utils";
import { agencyRepository } from "../repositories/agency-repository";
import { auditRepository } from "../repositories/audit-repository";
import { eventRepository } from "../repositories/event-repository";
import { hostRepository } from "../repositories/host-repository";
import { userRepository } from "../repositories/user-repository";
import type { CreateAgencyInput, AgencyApproveModelInput, UpdateAgencyInput, UpdateAgencyModelInput } from "../validators/agency";
import type { SessionActor } from "@missu/types";
import type { RequestContext } from "../lib/request";

async function getManagedAgency(actor: SessionActor) {
  const agency = await agencyRepository.getByOwnerId(actor.userId);

  if (!agency || agency.deletedAt) {
    throw new NotFoundError("Agency not found for actor");
  }

  return agency;
}

export const agencyService = {
  async create(actor: SessionActor, input: CreateAgencyInput, context: RequestContext) {
    const existing = await agencyRepository.getByOwnerId(actor.userId);

    if (existing) {
      throw new ConflictError("Agency already exists for this owner");
    }

    const publicId = await generateUniquePublicId({
      prefix: "A",
      digits: 9,
      exists: (candidate) => agencyRepository.existsByPublicId(candidate),
    });

    const createdEvent = createDomainEvent({
      name: "AGENCY_CREATED",
      aggregateType: "AGENCY",
      aggregateId: publicId,
      payload: { publicId, ownerId: actor.userId },
    });

    const agency = await db.transaction(async (tx) => {
      const created = await agencyRepository.create({
        publicId,
        ownerId: actor.userId,
        userId: actor.userId,
        agencyName: input.agencyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        country: input.country,
        status: "PENDING",
        approvalStatus: "PENDING",
        metadataJson: input.metadata ?? null,
      }, tx);

      if (!created) {
        throw new ConflictError("Unable to create agency");
      }

      await auditRepository.write({
        actorUserId: actor.userId,
        actorPlatformRole: actor.role,
        action: "AGENCY_CREATED",
        entityType: "AGENCY",
        entityId: created.id,
        metadataJson: { requestId: context.requestId, publicId },
      }, tx);
      await eventRepository.create({ ...createdEvent, aggregateId: created.id }, tx);

      return created;
    });

    const cacheValue = {
      id: agency.id,
      publicId: agency.publicId,
      ownerId: agency.ownerId,
      agencyName: agency.agencyName,
      status: agency.status,
      approvalStatus: agency.approvalStatus,
      createdAt: agency.createdAt.toISOString(),
    };
    await setCache(agencyCacheKey(agency.id), cacheValue, 300);
    await publishDomainEvent({ ...createdEvent, aggregateId: agency.id, payload: { publicId, ownerId: actor.userId } });

    return cacheValue;
  },

  async listRequests(actor: SessionActor, limit: number, offset: number) {
    const agency = await getManagedAgency(actor);
    const requests = await agencyRepository.listAgencyRequests(agency.id, limit, offset);
    return requests;
  },

  async listModels(actor: SessionActor, limit: number, offset: number) {
    const agency = await getManagedAgency(actor);
    return hostRepository.listByAgency(agency.id, limit, offset);
  },

  async approveModel(actor: SessionActor, input: AgencyApproveModelInput, context: RequestContext) {
    const publicId = await generateUniquePublicId({
      prefix: "AH",
      digits: 8,
      exists: (candidate) => hostRepository.existsByPublicId(candidate),
    });

    const approvedEvent = createDomainEvent({
      name: "HOST_APPROVED",
      aggregateType: "HOST",
      aggregateId: publicId,
      payload: { publicId },
    });

    const result = await db.transaction(async (tx) => {
      const agency = await agencyRepository.getByOwnerId(actor.userId, tx);

      if (!agency || agency.deletedAt) {
        throw new NotFoundError("Agency not found for actor");
      }

      const request = await agencyRepository.getAgencyRequest(input.requestId, tx);

      if (!request || request.agencyId !== agency.id || request.deletedAt) {
        throw new AuthorizationError("Request does not belong to the actor agency");
      }

      const existingHost = await hostRepository.getByUserId(request.userId, tx);
      if (existingHost) {
        throw new ConflictError("Host already exists for user");
      }

      const reviewed = await agencyRepository.reviewAgencyRequest(request.id, input.approve, actor.userId, input.notes, tx);

      if (!reviewed) {
        throw new NotFoundError("Agency request not found");
      }

      if (!input.approve) {
        await auditRepository.write({
          actorUserId: actor.userId,
          actorPlatformRole: actor.role,
          action: "AGENCY_REJECTED_MODEL",
          entityType: "AGENCY_REQUEST",
          entityId: reviewed.id,
          tenantAgencyId: agency.id,
          metadataJson: { requestId: context.requestId, notes: input.notes ?? null },
        }, tx);
        return reviewed;
      }

      const host = await hostRepository.create({
        hostId: publicId,
        publicId,
        userId: reviewed.userId,
        agencyId: reviewed.agencyId,
        type: "AGENCY",
        status: "APPROVED",
        approvedAt: new Date(),
        reviewNotes: input.notes ?? null,
        reviewedByAdminUserId: actor.userId,
      }, tx);

      if (!host) {
        throw new ConflictError("Unable to create host");
      }

      await userRepository.update(reviewed.userId, { role: "HOST", platformRole: "MODEL_AGENCY" }, tx);
      await auditRepository.write({
        actorUserId: actor.userId,
        actorPlatformRole: actor.role,
        action: "AGENCY_APPROVED_MODEL",
        entityType: "HOST",
        entityId: host.id,
        tenantAgencyId: agency.id,
        metadataJson: { requestId: context.requestId, publicId },
      }, tx);
      await eventRepository.create({ ...approvedEvent, aggregateId: host.id, payload: { publicId, userId: host.userId, agencyId: host.agencyId } }, tx);

      return host;
    });

    if ("agencyId" in result) {
      await deleteCache(agencyCacheKey(result.agencyId ?? ""));
      await publishDomainEvent({ ...approvedEvent, aggregateId: result.id, payload: { publicId, userId: result.userId, agencyId: result.agencyId } });
    }

    return result;
  },

  async updateModel(actor: SessionActor, hostId: string, input: UpdateAgencyModelInput, context: RequestContext) {
    const agency = await getManagedAgency(actor);
    const host = await hostRepository.getById(hostId);

    if (!host || host.agencyId !== agency.id) {
      throw new AuthorizationError("Host does not belong to the actor agency");
    }

    const updated = await db.transaction(async (tx) => {
      const nextHost = await hostRepository.update(hostId, {
        status: input.status ?? host.status,
        reviewNotes: input.reviewNotes ?? host.reviewNotes,
      }, tx);

      if (!nextHost) {
        throw new NotFoundError("Host not found");
      }

      if (input.platformRole) {
        await userRepository.update(host.userId, { platformRole: input.platformRole }, tx);
      }

      await auditRepository.write({
        actorUserId: actor.userId,
        actorPlatformRole: actor.role,
        action: "AGENCY_UPDATED_MODEL",
        entityType: "HOST",
        entityId: hostId,
        tenantAgencyId: agency.id,
        metadataJson: { requestId: context.requestId },
      }, tx);

      return nextHost;
    });

    return updated;
  },

  async update(actor: SessionActor, agencyId: string, input: UpdateAgencyInput, context: RequestContext) {
    const agency = await getManagedAgency(actor);

    if (agency.id !== agencyId) {
      throw new AuthorizationError("Agency does not belong to actor");
    }

    const nextMetadata = {
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
      metadataJson: nextMetadata,
      deletedAt: input.softDelete ? new Date() : agency.deletedAt,
    });

    if (!updated) {
      throw new NotFoundError("Agency not found");
    }

    await deleteCache(agencyCacheKey(agencyId));
    await auditRepository.write({
      actorUserId: actor.userId,
      actorPlatformRole: actor.role,
      action: "AGENCY_UPDATED",
      entityType: "AGENCY",
      entityId: agencyId,
      metadataJson: { requestId: context.requestId },
    });

    return updated;
  },
};