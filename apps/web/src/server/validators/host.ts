import { z } from "zod";

export const hostDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(3).max(120),
  base64Data: z.string().min(1),
});

export const applyHostSchema = z.object({
  agencyPublicId: z.string().regex(/^A\d{9}$/).optional(),
  talentInfo: z.string().min(10).max(2000),
  documents: z.array(hostDocumentSchema).max(10).default([]),
});

export const adminApproveHostSchema = z.object({
  requestId: z.uuid(),
  approve: z.boolean().default(true),
  reviewNotes: z.string().max(500).optional(),
});

export type ApplyHostInput = z.infer<typeof applyHostSchema>;
export type AdminApproveHostInput = z.infer<typeof adminApproveHostSchema>;