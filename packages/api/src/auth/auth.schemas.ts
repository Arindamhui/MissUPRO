import { z } from "zod";

export const sessionIntentSchema = z.enum(["login", "signup"]).default("login");

/** Portal role hint sent from the client to indicate which panel it targets. */
export const portalRoleSchema = z.enum(["admin", "agency"]).default("agency");

/** Mobile panel type hint. */
export const mobilePanelSchema = z.enum(["user", "model", "agency_model"]).default("user");

export const completeAgencySignupSchema = z.object({
  agencyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(320),
  country: z.string().trim().min(2).max(80),
});

export const emailLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export const emailSignupSchema = emailLoginSchema.extend({
  displayName: z.string().trim().min(2).max(120),
  referralCode: z.string().trim().min(2).max(64).optional(),
});

export const googleAuthSchema = z.object({
  idToken: z.string().trim().min(20),
  displayName: z.string().trim().min(2).max(120).optional(),
  referralCode: z.string().trim().min(2).max(64).optional(),
});

export const completeMobileOnboardingSchema = z.object({
  selectedRole: z.enum(["USER", "MODEL_INDEPENDENT", "MODEL_AGENCY"]),
  agencyId: z.string().trim().min(3).max(120).optional(),
  profileData: z.record(z.string(), z.unknown()).optional(),
});

/** Schema for agency-model login (model logging in via agency). */
export const agencyModelLoginSchema = z.object({
  agencyId: z.string().trim().min(3, "A valid Agency ID is required").max(120),
});

export type SessionIntent = z.infer<typeof sessionIntentSchema>;
export type PortalRole = z.infer<typeof portalRoleSchema>;
export type MobilePanel = z.infer<typeof mobilePanelSchema>;
export type CompleteAgencySignupInput = z.infer<typeof completeAgencySignupSchema>;
export type CompleteMobileOnboardingInput = z.infer<typeof completeMobileOnboardingSchema>;
export type AgencyModelLoginInput = z.infer<typeof agencyModelLoginSchema>;
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;
export type EmailSignupInput = z.infer<typeof emailSignupSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;