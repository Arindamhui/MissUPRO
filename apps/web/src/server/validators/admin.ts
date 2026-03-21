import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const updateAdminUserSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  phone: z.string().min(8).max(32).nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "PENDING_VERIFICATION", "DELETED"]).optional(),
  role: z.enum(["USER", "HOST", "MODEL", "ADMIN"]).optional(),
  platformRole: z.enum(["USER", "MODEL_INDEPENDENT", "MODEL_AGENCY", "AGENCY", "ADMIN"]).optional(),
  authRole: z.enum(["admin", "agency"]).nullable().optional(),
  softDelete: z.boolean().optional(),
});

export const updateAdminHostSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  agencyId: z.uuid().nullable().optional(),
  reviewNotes: z.string().max(500).nullable().optional(),
  softDelete: z.boolean().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type UpdateAdminHostInput = z.infer<typeof updateAdminHostSchema>;