import { Injectable } from "@nestjs/common";
import { TrpcService } from "../trpc/trpc.service";
import { ModelService } from "./model.service";
import {
  submitModelApplicationSchema,
  updateAvailabilitySchema,
  setOnlineOverrideSchema,
  createModelDemoVideoSchema,
} from "@missu/types";

@Injectable()
export class ModelRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly modelService: ModelService,
  ) {}

  get router() {
    return this.trpc.router({
      submitApplication: this.trpc.protectedProcedure
        .input(submitModelApplicationSchema)
        .mutation(async ({ ctx, input }) => {
          return this.modelService.submitApplication(ctx.userId, input);
        }),

      getMyApplicationStatus: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.modelService.getApplicationStatus(ctx.userId);
        }),

      getMyAvailability: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.modelService.getAvailability(ctx.userId);
        }),

      updateAvailability: this.trpc.protectedProcedure
        .input(updateAvailabilitySchema)
        .mutation(async ({ ctx, input }) => {
          return this.modelService.updateAvailability(ctx.userId, input.schedule);
        }),

      setOnlineOverride: this.trpc.protectedProcedure
        .input(setOnlineOverrideSchema)
        .mutation(async ({ ctx, input }) => {
          return this.modelService.setOnlineOverride(ctx.userId, input.isOnline);
        }),

      getMyDemoVideos: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.modelService.getDemoVideos(ctx.userId)),

      createDemoVideo: this.trpc.protectedProcedure
        .input(createModelDemoVideoSchema)
        .mutation(async ({ ctx, input }) => this.modelService.createDemoVideo(ctx.userId, input)),

      getMyStats: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.modelService.getMyStats(ctx.userId)),

      getMyLevel: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.modelService.getModelLevel(ctx.userId);
        }),

      getMyLevelHistory: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.modelService.getLevelHistory(ctx.userId);
        }),

      getMyReviews: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.modelService.getMyReviews(ctx.userId);
        }),
    });
  }
}
