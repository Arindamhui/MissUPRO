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
