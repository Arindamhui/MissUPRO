import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { UserService } from "./user.service";
import { ModelService } from "../models/model.service";
import {
  blockUserSchema, unblockUserSchema, requestAccountDeletionSchema,
  submitModelReviewSchema, getModelReviewsSchema,
  getPresenceSchema, getPresenceBulkSchema,
  getModelAvailabilitySchema, getModelDemoVideosSchema,
} from "@missu/types";

const followGraphInputSchema = z.object({
  userId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(30),
});

const updateMyProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  locationDisplay: z.string().max(160).optional().nullable(),
});

const updateInboxPreferencesSchema = z.object({
  dmPrivacyRule: z.enum(["ALL_USERS", "FOLLOWED_USERS", "HIGHER_LEVEL_USERS"]).optional(),
  allowLiveStreamLinks: z.boolean().optional(),
}).refine((value) => value.dmPrivacyRule !== undefined || value.allowLiveStreamLinks !== undefined, {
  message: "At least one inbox preference must be updated",
});

const registerPushTokenSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["IOS", "ANDROID", "WEB"]),
  deviceId: z.string().min(1).max(255),
});

@Injectable()
export class UserRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly userService: UserService,
    private readonly modelService: ModelService,
  ) {}

  get router() {
    return this.trpc.router({
      getMe: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.userService.getUserById(ctx.userId);
        }),

      getMyProfile: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.userService.getMyProfile(ctx.userId)),

      getUserSummary: this.trpc.protectedProcedure
        .input(z.object({ userId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.userService.getPublicUserSummary(input.userId);
        }),

      updateMyProfile: this.trpc.protectedProcedure
        .input(updateMyProfileSchema)
        .mutation(async ({ ctx, input }) => this.userService.updateMyProfile(ctx.userId, input)),

      getInboxPreferences: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.userService.getInboxPreferences(ctx.userId)),

      updateInboxPreferences: this.trpc.protectedProcedure
        .input(updateInboxPreferencesSchema)
        .mutation(async ({ ctx, input }) => this.userService.updateInboxPreferences(ctx.userId, input)),

      registerPushToken: this.trpc.protectedProcedure
        .input(registerPushTokenSchema)
        .mutation(async ({ ctx, input }) => this.userService.registerPushToken(ctx.userId, input.token, input.platform, input.deviceId)),

      followUser: this.trpc.protectedProcedure
        .input(z.object({ targetUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.userService.followUser(ctx.userId, input.targetUserId)),

      unfollowUser: this.trpc.protectedProcedure
        .input(z.object({ targetUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.userService.unfollowUser(ctx.userId, input.targetUserId)),

      isFollowing: this.trpc.protectedProcedure
        .input(z.object({ targetUserId: z.string().uuid() }))
        .query(async ({ ctx, input }) => this.userService.isFollowing(ctx.userId, input.targetUserId)),

      listFollowers: this.trpc.protectedProcedure
        .input(followGraphInputSchema.optional())
        .query(async ({ ctx, input }) => this.userService.listFollowers(input?.userId ?? ctx.userId, input?.cursor, input?.limit ?? 30)),

      listFollowing: this.trpc.protectedProcedure
        .input(followGraphInputSchema.optional())
        .query(async ({ ctx, input }) => this.userService.listFollowing(input?.userId ?? ctx.userId, input?.cursor, input?.limit ?? 30)),

      blockUser: this.trpc.protectedProcedure
        .input(blockUserSchema)
        .mutation(async ({ ctx, input }) => {
          return this.userService.blockUser(ctx.userId, input.targetUserId, input.reason);
        }),

      unblockUser: this.trpc.protectedProcedure
        .input(unblockUserSchema)
        .mutation(async ({ ctx, input }) => {
          return this.userService.unblockUser(ctx.userId, input.targetUserId);
        }),

      getBlockedUsers: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.userService.getBlockedUsers(ctx.userId);
        }),

      isBlocked: this.trpc.protectedProcedure
        .input(z.object({ targetUserId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.userService.isBlocked(ctx.userId, input.targetUserId);
        }),

      requestAccountDeletion: this.trpc.protectedProcedure
        .input(requestAccountDeletionSchema)
        .mutation(async ({ ctx, input }) => {
          return this.userService.requestAccountDeletion(ctx.userId, input.reason);
        }),

      submitModelReview: this.trpc.protectedProcedure
        .input(submitModelReviewSchema)
        .mutation(async ({ ctx, input }) => {
          return this.userService.submitModelReview(
            ctx.userId, input.modelUserId, input.callSessionId,
            input.rating, input.reviewText,
          );
        }),

      getModelReviews: this.trpc.protectedProcedure
        .input(getModelReviewsSchema)
        .query(async ({ input }) => {
          return this.userService.getModelReviews(input.modelUserId, input.limit, input.cursor);
        }),

      getModelAvailability: this.trpc.protectedProcedure
        .input(getModelAvailabilitySchema)
        .query(async ({ input }) => this.modelService.getAvailabilitySummary(input.modelUserId)),

      getModelDemoVideos: this.trpc.protectedProcedure
        .input(getModelDemoVideosSchema)
        .query(async ({ input }) => this.modelService.getDemoVideos(input.modelUserId, input.status)),

      getPresence: this.trpc.protectedProcedure
        .input(getPresenceSchema)
        .query(async ({ input }) => {
          return this.userService.getPresenceStatus(input.userId);
        }),

      getPresenceBulk: this.trpc.protectedProcedure
        .input(getPresenceBulkSchema)
        .query(async ({ input }) => {
          return this.userService.getPresenceBulk(input.userIds);
        }),
    });
  }
}
