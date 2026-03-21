import { z } from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  phone: z.string().min(8).max(32).optional(),
  country: z.string().min(2).max(56).optional(),
  preferredLocale: z.string().min(2).max(12).optional(),
  preferredTimezone: z.string().min(2).max(64).optional(),
  referralCode: z.string().min(2).max(64).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(10),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  phone: z.string().min(8).max(32).nullable().optional(),
  avatarUrl: z.url().nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  country: z.string().min(2).max(56).optional(),
  preferredLocale: z.string().min(2).max(12).optional(),
  preferredTimezone: z.string().min(2).max(64).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;