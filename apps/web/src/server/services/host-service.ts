import { randomUUID } from "node:crypto";
import { db } from "@missu/db";
import { getEnv } from "@missu/config";
import { deleteCache, userProfileCacheKey } from "@missu/cache";
import { createDomainEvent, publishDomainEvent } from "@missu/queue";
import { ConflictError, NotFoundError, generateUniquePublicId } from "@missu/utils";
import { agencyRepository } from "../repositories/agency-repository";
import { auditRepository } from "../repositories/audit-repository";
import { eventRepository } from "../repositories/event-repository";
import { hostRepository } from "../repositories/host-repository";
import { userRepository } from "../repositories/user-repository";
import { storageService } from "./storage-service";
import type { SessionActor } from "@missu/types";
import type { RequestContext } from "../lib/request";
import type { ApplyHostInput, AdminApproveHostInput } from "../validators/host";

export const hostService = {
  async apply(actor: SessionActor, input: ApplyHostInput, context: RequestContext) {
    if (await hostRepository.getByUserId(actor.userId)) {
      throw new ConflictError("Host already exists for user");
    }

    if (input.agencyPublicId) {
      const agency = await agencyRepository.getByPublicId(input.agencyPublicId);

      if (!agency || agency.approvalStatus !== "APPROVED") {
        throw new NotFoundError("Agency not found or not approved");
      }

      const request = await agencyRepository.createAgencyRequest({
        userId: actor.userId,
        agencyId: agency.id,
        status: "PENDING",
        notes: input.talentInfo,
        metadataJson: { requestId: context.requestId },
      });

      if (!request) {
        throw new ConflictError("Unable to create agency request");
      }

      const event = createDomainEvent({
        name: "HOST_REQUESTED",
        aggregateType: "AGENCY_REQUEST",
        aggregateId: request.id,
        payload: { userId: actor.userId, agencyId: agency.id },
      });
      await eventRepository.create(event);
      await publishDomainEvent(event);
      return { requestType: "AGENCY", request };
    }

    if (input.documents.length === 0) {
      throw new ConflictError("Independent host applications require documents");
    }

    const requestId = randomUUID();
    const uploaded = await storageService.uploadHostDocuments(actor.userId, requestId, input.documents);
    const request = await hostRepository.createHostRequest({
      id: requestId,
      userId: actor.userId,
      requestType: "PLATFORM",
      documentsJson: uploaded,
      storageKeysJson: uploaded.map((item) => item.objectKey),
      talentInfo: input.talentInfo,
      status: "PENDING",
      idempotencyKey: context.idempotencyKey,
    });

    if (!request) {
      throw new ConflictError("Unable to create host request");
    }

    const event = createDomainEvent({
      name: "HOST_REQUESTED",
      aggregateType: "HOST_REQUEST",
      aggregateId: request.id,
      payload: { userId: actor.userId, requestType: "PLATFORM" },
    });
    await eventRepository.create(event);
    await publishDomainEvent(event);
    return { requestType: "PLATFORM", request };
  },

  async status(actor: SessionActor) {
    const latest = await hostRepository.getLatestStatusByUserId(actor.userId);
    return latest;
  },

  async adminApprove(actor: SessionActor, input: AdminApproveHostInput, context: RequestContext) {
    const result = await db.transaction(async (tx) => {
      const request = await hostRepository.getHostRequest(input.requestId, tx);

      if (!request || request.deletedAt) {
        throw new NotFoundError("Host request not found");
      }

      const existingHost = await hostRepository.getByUserId(request.userId, tx);
      if (existingHost) {
        throw new ConflictError("Host already exists for user");
      }

      const reviewed = await hostRepository.reviewHostRequest(request.id, input.approve, actor.userId, input.reviewNotes, tx);

      if (!reviewed) {
        throw new ConflictError("Unable to update host request");
      }

      if (!input.approve) {
        await auditRepository.write({
          actorUserId: actor.userId,
          actorPlatformRole: actor.role,
          action: "ADMIN_REJECTED_HOST",
          entityType: "HOST_REQUEST",
          entityId: reviewed.id,
          metadataJson: { requestId: context.requestId, notes: input.reviewNotes ?? null },
        }, tx);
        return reviewed;
      }

      let agencyId = reviewed.agencyId;
      if (!agencyId && getEnv().DEFAULT_AGENCY_PUBLIC_ID) {
        const configuredAgency = await agencyRepository.getByPublicId(getEnv().DEFAULT_AGENCY_PUBLIC_ID, tx);
        agencyId = configuredAgency?.id ?? null;
      }

      if (!agencyId) {
        const defaultAgency = await agencyRepository.getDefaultAgency();
        agencyId = defaultAgency?.id ?? null;
      }

      if (!agencyId) {
        throw new ConflictError("Default agency is not configured");
      }

      // Host IDs: agency hosts get AH + 8 digits, platform hosts get H + 9 digits
      const isAgencyHost = reviewed.requestType === "AGENCY";
      const publicId = await generateUniquePublicId({
        prefix: isAgencyHost ? "AH" : "H",
        digits: isAgencyHost ? 8 : 9,
        exists: (candidate) => hostRepository.existsByPublicId(candidate),
      });

      const host = await hostRepository.create({
        hostId: publicId,
        publicId,
        userId: reviewed.userId,
        agencyId,
        type: isAgencyHost ? "AGENCY" : "PLATFORM",
        status: "APPROVED",
        approvedAt: new Date(),
        reviewNotes: input.reviewNotes ?? null,
        reviewedByAdminUserId: actor.userId,
      }, tx);

      const approvedEvent = createDomainEvent({
        name: "HOST_APPROVED",
        aggregateType: "HOST",
        aggregateId: host?.id ?? publicId,
        payload: { publicId, userId: reviewed.userId, agencyId },
      });

      if (!host) {
        throw new ConflictError("Unable to create host record");
      }

      await userRepository.update(reviewed.userId, { role: "HOST", platformRole: reviewed.requestType === "AGENCY" ? "MODEL_AGENCY" : "MODEL_INDEPENDENT" }, tx);
      await auditRepository.write({
        actorUserId: actor.userId,
        actorPlatformRole: actor.role,
        action: "ADMIN_APPROVED_HOST",
        entityType: "HOST",
        entityId: host.id,
        tenantAgencyId: agencyId,
        metadataJson: { requestId: context.requestId, publicId },
      }, tx);
      await eventRepository.create({ ...approvedEvent, aggregateId: host.id, payload: { publicId, userId: host.userId, agencyId } }, tx);

      return { host, approvedEvent, publicId };
    });

    if ("host" in result) {
      const { host, approvedEvent, publicId } = result;
      await deleteCache(userProfileCacheKey(host.userId));
      await publishDomainEvent({ ...approvedEvent, aggregateId: host.id, payload: { publicId, userId: host.userId, agencyId: host.agencyId } });
      return host;
    }

    return result;
  },
};