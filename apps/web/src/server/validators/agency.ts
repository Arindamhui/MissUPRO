import { z } from "zod";

export const createAgencySchema = z.object({
  agencyName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(80),
  contactEmail: z.email(),
  country: z.string().min(2).max(56),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const agencyApproveModelSchema = z.object({
  requestId: z.uuid(),
  approve: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

export const adminApproveAgencySchema = z.object({
  agencyId: z.uuid(),
  approve: z.boolean().default(true),
  notes: z.string().max(500).optional(),
  assignOwnerAgencyRole: z.boolean().default(true),
});

export const updateAgencySchema = z.object({
  agencyName: z.string().min(2).max(120).optional(),
  contactName: z.string().min(2).max(80).optional(),
  contactEmail: z.email().optional(),
  country: z.string().min(2).max(56).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED", "PENDING", "DELETED"]).optional(),
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  defaultForIndependentHosts: z.boolean().optional(),
  softDelete: z.boolean().optional(),
});

export const updateAgencyModelSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  reviewNotes: z.string().max(500).nullable().optional(),
  platformRole: z.enum(["MODEL_AGENCY", "MODEL_INDEPENDENT"]).optional(),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type AgencyApproveModelInput = z.infer<typeof agencyApproveModelSchema>;
export type AdminApproveAgencyInput = z.infer<typeof adminApproveAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
export type UpdateAgencyModelInput = z.infer<typeof updateAgencyModelSchema>;